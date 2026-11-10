import os
import cv2
import numpy as np
from PIL import Image

def clean_frame(frame_bgr):
    b = frame_bgr[:, :, 0].astype(np.float32)
    g = frame_bgr[:, :, 1].astype(np.float32)
    r = frame_bgr[:, :, 2].astype(np.float32)
    
    max_rb = np.maximum(r, b)
    diff = g - max_rb
    
    # Key out green screen background
    t0 = 5.0
    t1 = 30.0
    val = np.clip((diff - t0) / (t1 - t0), 0.0, 1.0)
    # Smooth Hermite curve
    val = val * val * (3.0 - 2.0 * val)
    alpha = (1.0 - val)
    
    # Despill: clamp green channel to prevent green reflection on characters
    g_clean = np.where(g > max_rb, max_rb, g)
    
    # Edge glow tint: turn any green edge glow into soft rosy/silver sparkle
    r_tint = np.where(val > 0.05, np.maximum(r, 185.0 * (1.0 - val)), r)
    b_tint = np.where(val > 0.05, np.maximum(b, 165.0 * (1.0 - val)), b)
    
    # Clean up low-alpha noise
    alpha = np.where(alpha < 0.04, 0.0, alpha)
    
    rgba = np.zeros((frame_bgr.shape[0], frame_bgr.shape[1], 4), dtype=np.uint8)
    rgba[:, :, 0] = np.clip(r_tint, 0, 255).astype(np.uint8)
    rgba[:, :, 1] = np.clip(g_clean, 0, 255).astype(np.uint8)
    rgba[:, :, 2] = np.clip(b_tint, 0, 255).astype(np.uint8)
    rgba[:, :, 3] = np.clip(alpha * 255.0, 0, 255).astype(np.uint8)
    return rgba

def generate_assets():
    out_dir = 'apps/mobile/assets/characters'
    os.makedirs(out_dir, exist_ok=True)
    
    video_path = 'apps/fusion.mp4'
    cap = cv2.VideoCapture(video_path)
    
    # First fusion cycle is 61 frames (0 to 60)
    frames_pil = []
    print('Processing 61 frames...')
    for i in range(61):
        ret, frame = cap.read()
        if not ret:
            break
        rgba = clean_frame(frame)
        # Scale to 360x640 for silky-smooth 60fps mobile rendering
        rgba_resized = cv2.resize(rgba, (360, 640), interpolation=cv2.INTER_AREA)
        frames_pil.append(Image.fromarray(rgba_resized))
    cap.release()
    print(f'Processed {len(frames_pil)} frames.')
    
    # 1. Save animated WebP
    webp_path = os.path.join(out_dir, 'fusion.webp')
    # duration per frame in ms: 1000 / 24 = ~41.6ms -> 42ms
    frames_pil[0].save(
        webp_path,
        save_all=True,
        append_images=frames_pil[1:],
        duration=42,
        loop=1, # loop=1 plays once and stops on frame 60 (Garnet)
        quality=85,
        method=3
    )
    sz_webp = os.path.getsize(webp_path)
    print(f'Saved {webp_path} ({sz_webp / 1024:.1f} KB)')
    
    # Also save to public for web
    pub_dir = 'apps/mobile/public'
    os.makedirs(pub_dir, exist_ok=True)
    frames_pil[0].save(
        os.path.join(pub_dir, 'fusion.webp'),
        save_all=True,
        append_images=frames_pil[1:],
        duration=42,
        loop=0,
        quality=85,
        method=3
    )

    # 2. Save final settled frame (Garnet posing)
    settled_path = os.path.join(out_dir, 'fusion-settled.png')
    frames_pil[-1].save(settled_path, format='PNG')
    frames_pil[-1].save(os.path.join(pub_dir, 'fusion-settled.png'), format='PNG')
    print(f'Saved {settled_path}')
    
    # 3. Extract audio: 168 AAC frames (~3.58s) so the entire fusion chord and reverb tail finish naturally without being cut off
    extract_audio(video_path, os.path.join(out_dir, 'fusion.aac'), max_packets=168)
    extract_audio(video_path, os.path.join(pub_dir, 'fusion.aac'), max_packets=168)

def extract_audio(mp4_path, out_aac_path, max_packets=168):
    with open(mp4_path, 'rb') as f:
        data = f.read(20000)
        mp4a_pos = data.find(b'mp4a')
        stsc_pos = data.find(b'stsc', mp4a_pos)
        stsz_pos = data.find(b'stsz', mp4a_pos)
        stco_pos = data.find(b'stco', mp4a_pos)
        
        import struct
        f.seek(stsz_pos + 12)
        sample_count = struct.unpack('>I', f.read(4))[0]
        sample_sizes = [struct.unpack('>I', f.read(4))[0] for _ in range(sample_count)]
        
        f.seek(stco_pos + 8)
        chunk_count = struct.unpack('>I', f.read(4))[0]
        chunk_offsets = [struct.unpack('>I', f.read(4))[0] for _ in range(chunk_count)]
        
        f.seek(stsc_pos + 8)
        stsc_count = struct.unpack('>I', f.read(4))[0]
        stsc_entries = []
        for _ in range(stsc_count):
            first_chunk, samples_per_chunk, desc_idx = struct.unpack('>III', f.read(12))
            stsc_entries.append((first_chunk, samples_per_chunk, desc_idx))
            
        chunk_samples = []
        for i in range(len(chunk_offsets)):
            chunk_num = i + 1
            spc = stsc_entries[0][1]
            for ent in stsc_entries:
                if chunk_num >= ent[0]:
                    spc = ent[1]
            chunk_samples.append(spc)
            
        sample_idx = 0
        total_audio_bytes = 0
        with open(out_aac_path, 'wb') as out_f:
            for chunk_idx, offset in enumerate(chunk_offsets):
                f.seek(offset)
                spc = chunk_samples[chunk_idx]
                for _ in range(spc):
                    if sample_idx >= len(sample_sizes) or sample_idx >= max_packets:
                        break
                    sz = sample_sizes[sample_idx]
                    sample_idx += 1
                    raw_frame = f.read(sz)
                    
                    frame_len = 7 + sz
                    b0 = 0xFF
                    b1 = 0xF1
                    b2 = (1 << 6) | (3 << 2) | (0 << 1) | (2 >> 2)
                    b3 = ((2 & 3) << 6) | ((frame_len >> 11) & 0x03)
                    b4 = (frame_len >> 3) & 0xFF
                    b5 = ((frame_len & 7) << 5) | 0x1F
                    b6 = 0xFC
                    
                    out_f.write(bytes([b0, b1, b2, b3, b4, b5, b6]) + raw_frame)
                    total_audio_bytes += frame_len
                    
        print(f'Saved {out_aac_path} ({total_audio_bytes / 1024:.1f} KB)')

if __name__ == '__main__':
    generate_assets()

