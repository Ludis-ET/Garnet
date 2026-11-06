//
// GarnetWidgetViews.swift
// Garnet Smart Widget Engine (iOS WidgetKit, B12, P-90)
//
// Privacy-first long-distance connection widget for exactly two partners:
// Addis Ababa (UTC+3) and London (UTC+0 / UTC+1).
// Honors §5 Product Guardrails: never leaks private drafts, unread counts, or relationship scores.
//

import SwiftUI
import WidgetKit

struct WidgetSnapshotData: Codable {
    let ready: Bool
    let mySide: String?
    let partnerSide: String?
    let myZone: String
    let partnerZone: String?
    let special: Bool
    let somethingNew: Bool
    let waiting: Bool
    let nextEventDays: Int?
    let km: Int?
    let partnerPart: String?
    let partnerAwake: Bool?
    let partnerMood: String?
    let recentSignal: String?
    let sparkActive: Bool
    let dayRecapReady: Bool
    let togetherDays: Int?
}

struct GarnetEntry: TimelineEntry {
    let date: Date
    let snapshot: WidgetSnapshotData?
}

// MARK: - Smart Look & Copy Helper
struct SmartContext {
    static func greeting(for snapshot: WidgetSnapshotData?, date: Date) -> String {
        guard let s = snapshot, s.ready else { return "Open Garnet to begin 💜" }
        if s.special { return "Special day together ✨" }
        if s.recentSignal == "thought" { return "Thinking of you 💜" }
        if s.recentSignal == "hug" || s.recentSignal == "missing" { return "Warm hugs sent 💜" }
        if s.partnerMood == "loving" { return "Feeling loved & close 💜" }
        if s.partnerMood == "dancing" { return "Joyful energy ✨" }
        if s.partnerMood == "sleepy" { return "Resting peacefully 🌙" }
        if s.partnerMood == "cozy" { return "Cozy moments ☕" }
        if s.partnerMood == "calm" { return "Peaceful moments 🌿" }
        if s.sparkActive { return "Shared Spark is glowing ✨" }
        if s.waiting { return "Something waiting for you 💌" }
        
        if let pZone = s.partnerZone, s.partnerAwake == false {
            let city = pZone.split(separator: "/").last.map { String($0).replacingOccurrences(of: "_", with: " ") } ?? "Partner"
            return "\(city) is resting 🌙"
        }
        
        return "Garnet is with you 💜"
    }
    
    static func city(from zone: String?) -> String {
        guard let z = zone else { return "" }
        return z.split(separator: "/").last.map { String($0).replacingOccurrences(of: "_", with: " ") } ?? z
    }
}

// MARK: - Smart Glance View (Medium & Large)
struct SmartGlanceWidgetView: View {
    let entry: GarnetEntry
    
    var body: some View {
        ZStack {
            ContainerRelativeShape()
                .fill(LinearGradient(
                    colors: [Color(red: 0.13, green: 0.11, blue: 0.20), Color(red: 0.08, green: 0.06, blue: 0.13)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ))
            
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Image(systemName: "sparkles")
                        .foregroundColor(.purple)
                    Text("Garnet")
                        .font(.system(size: 13, weight: .semibold, design: .rounded))
                        .foregroundColor(.white.opacity(0.8))
                    Spacer()
                    if let days = entry.snapshot?.togetherDays {
                        Text("\(days) days together 💜")
                            .font(.system(size: 11, weight: .medium, design: .rounded))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(Color.white.opacity(0.12))
                            .clipShape(Capsule())
                            .foregroundColor(.white)
                    }
                }
                
                Spacer()
                
                Text(SmartContext.greeting(for: entry.snapshot, date: entry.date))
                    .font(.system(size: 16, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
                    .lineLimit(2)
                
                HStack(spacing: 12) {
                    if let myZone = entry.snapshot?.myZone {
                        Label(SmartContext.city(from: myZone), systemImage: "clock")
                            .font(.system(size: 11, weight: .medium, design: .rounded))
                            .foregroundColor(.white.opacity(0.6))
                    }
                    if let pZone = entry.snapshot?.partnerZone {
                        Label(SmartContext.city(from: pZone), systemImage: "globe.europe.africa")
                            .font(.system(size: 11, weight: .medium, design: .rounded))
                            .foregroundColor(.white.opacity(0.6))
                    }
                    Spacer()
                    if let km = entry.snapshot?.km {
                        Text("≈ \(km) km")
                            .font(.system(size: 11, weight: .medium, design: .rounded))
                            .foregroundColor(.white.opacity(0.6))
                    }
                }
            }
            .padding(14)
        }
    }
}

// MARK: - Lock Screen Circular & Rectangular Accessory
struct LockScreenAccessoryView: View {
    let entry: GarnetEntry
    @Environment(\.widgetFamily) var family
    
    var body: some View {
        switch family {
        case .accessoryCircular:
            ZStack {
                AccessoryWidgetBackground()
                VStack(spacing: 1) {
                    Image(systemName: entry.snapshot?.sparkActive == true ? "flame.fill" : "heart.fill")
                        .font(.system(size: 14))
                    if let days = entry.snapshot?.nextEventDays {
                        Text("\(days)d")
                            .font(.system(size: 10, weight: .bold, design: .rounded))
                    } else {
                        Text("💜")
                            .font(.system(size: 8))
                    }
                }
            }
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 4) {
                    Image(systemName: "sparkles")
                    Text("Garnet")
                        .font(.headline)
                }
                Text(SmartContext.greeting(for: entry.snapshot, date: entry.date))
                    .font(.caption)
                    .lineLimit(2)
            }
        default:
            Text("Garnet")
        }
    }
}

