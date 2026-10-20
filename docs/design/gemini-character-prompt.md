# Gemini prompt: character images for the app

Owner direction **P-45**. The owner generates the Ruby, Sapphire and Garnet images with Gemini and drops them into `apps/mobile/assets/characters/incoming/` (git-ignored). The app then uses them on every page, mood and occasion. Rights are the owner's responsibility; **U-10 stays unresolved and public distribution stays blocked.**

## How to use it

1. In Gemini (image generation), paste **Part 1** once at the start of the chat. If you have reference images of the characters, attach one or two per character with it; that keeps every image on-model.
2. Then ask for the shots in **Part 2** in small batches (for example "Generate D-01 to D-03", then "Generate the happy mood for all three"). Gemini makes a few images per reply.
3. Save each image with the **exact file name** shown (upper or lower case both work), into `apps/mobile/assets/characters/incoming/`. Any of `.png`, `.webp`, `.jpg` or `.gif` works.
4. Tell Claude. Claude removes the green background, crops every image to the same frame (feet on the bottom edge), checks the names, and moves them into place. Anything missing shows a placeholder until it arrives.

You don't need everything at once. Minimum to start: the three defaults (`ruby`, `sapphire`, `garnet`). Next most useful: the moods. Then the occasions, then fusion.

---

## Part 1 · Style and characters (paste once)

```text
You are creating a consistent set of character images for a private mobile app about a
long-distance couple. The characters are Ruby, Sapphire and Garnet from Steven Universe, drawn
exactly in the visual style of Steven Universe: The Movie (2019): clean confident line art in a
slightly darker shade of each colour area, flat cel colours with one soft shadow tone, gentle
rim light, expressive faces, appealing rounded shapes. Stay on-model: every image of a character
must match the same design, proportions and colours.

EVERY IMAGE MUST FOLLOW THESE RULES
- One character per image (unless the shot says otherwise), full body, head to toe, nothing cut off.
- Facing the viewer (straight on or a slight three-quarter turn), centred horizontally.
- Feet resting on the bottom edge of the image, with a little empty space above the head.
- Portrait 2:3 (for example 1024 x 1536 px).
- Background: one solid flat pure green #00FF00 everywhere behind the character. No gradient, no
  floor, no shadow on the background, no scenery, no glow spilling onto the background.
- No green anywhere on the character or props (green is cut out afterwards).
- No text, letters, logos, watermarks, signatures or borders.
- Keep the scale consistent: Garnet is about 1.6 times as tall as Ruby; Sapphire is about as
  tall as Ruby (her hair makes her look a little taller).
- Warm, kind and funny in tone. Never sad, angry, crying, scared or abandoned.

RUBY
Short, stocky and strong. Bright coral-red skin. A big, wide, rounded-square block of very dark
maroon hair that comes down past her cheeks. A dark-red headband across her forehead, tied at the
side with two short ribbon tails. Big round cartoon eyes (white with black pupils), a small
rounded nose, a wide expressive mouth, often a toothy grin. A maroon tank top, very dark maroon
shorts, pointed maroon boots to mid-calf. Thick arms with mitten-like hands. A square, faceted
red ruby set in the palm of her LEFT hand. Fiery, energetic, impulsive, deeply loving.

SAPPHIRE
Small, graceful and calm. Periwinkle-blue skin. A huge cloud of soft, wavy, pale sky-blue hair
that falls to her waist; thick bangs cover the upper half of her face so her single eye is
hidden (only her nose, mouth and cheeks show). Big puffy white short sleeves, a navy top with a
lighter blue V-shaped panel, a long, full, floor-length deep-blue bell skirt with a lighter blue
front panel and a pale frilly underlayer showing at the hem, like an open geode. Long white
gloves to the elbow. A teardrop-shaped faceted blue sapphire in the palm of her RIGHT hand.
Gentle, composed, quietly funny, deeply loving. She often floats a little.

GARNET
Tall, strong and curvy, with long legs and a narrow waist. Deep magenta-red skin. A huge
cube-shaped afro, near-black with a hint of deep plum. A wide wraparound visor across her eyes
(pale cyan fading to soft pink, glossy); her three eyes are hidden behind it unless a shot says
so. Full lips, often a calm, knowing smile. A black bodysuit with a large five-point star on her
chest, split into hot pink and light pink halves; rounded crimson shoulder puffs; one leg dark
crimson and one leg black; small pink pointed feet. Ruby's square red gem in her LEFT palm and
Sapphire's teardrop blue gem in her RIGHT palm. Steady, wise, protective, secretly playful.
Garnet is the fusion of Ruby and Sapphire.

FILE NAMES
I will ask for shots by code. Each shot has a file name; name the image exactly that.
```

---

## Part 2 · Shot list (ask in batches)

### A. Defaults (start here)

| Code | File           | Shot                                                            |
| ---- | -------------- | --------------------------------------------------------------- |
| D-01 | `ruby.png`     | Ruby standing relaxed, small confident smile, gem hand visible  |
| D-02 | `sapphire.png` | Sapphire standing gracefully, hands softly together, calm smile |
| D-03 | `garnet.png`   | Garnet standing tall, arms relaxed, calm knowing smile          |

### B. Moods: one image per character for each mood

For each mood, make one image of **each** character, named `<character>-<mood>.png`, for example `ruby-happy.png`, `sapphire-happy.png`, `garnet-happy.png`. That's 18 moods × 3 = 54 images. Keep each character's own personality in the pose.

| Mood          | Direction for all three                                                                            |
| ------------- | -------------------------------------------------------------------------------------------------- |
| `calm`        | Relaxed standing, soft smile, peaceful                                                             |
| `happy`       | Big warm smile, slight lean, arms open a little                                                    |
| `joyful`      | Jumping or bouncing with excitement, sparkling eyes (Ruby: star eyes), arms up                     |
| `loving`      | Hands over the heart, blushing, little hearts around them (Ruby: heart eyes)                       |
| `hello`       | Waving hello with the gem hand, friendly grin                                                      |
| `hug`         | Arms wide open for a hug, eyes closed with a happy smile                                           |
| `thinking`    | Hand on chin, head tilted, looking up, curious                                                     |
| `listening`   | Leaning in, head tilted, gentle attentive smile                                                    |
| `sleepy`      | Eyes closed, cosy little yawn, swaying, a small "z" above the head                                 |
| `proud`       | Chin up, hands on hips, satisfied grin                                                             |
| `celebrating` | Both arms in the air, cheering, mouth open in a big laugh                                          |
| `shy`         | Blushing hard, hands together in front, looking slightly down, small smile                         |
| `surprised`   | Happy surprise: eyes wide, mouth in an "o", hands up near the face (pleasant, never scared)        |
| `dreamy`      | Hands clasped by the cheek, looking up dreamily, soft blush, thinking of someone                   |
| `laughing`    | Doubled over laughing, holding the tummy, eyes squeezed shut                                       |
| `silly`       | Goofy face: tongue out, one eye winking, playful pose (Garnet: visor slightly lowered with a wink) |
| `dancing`     | Mid-dance, one leg up, arms swinging, having fun                                                   |
| `sneaky`      | Tiptoeing with a finger to the lips and a mischievous grin, as if planning a surprise              |

### C. Talking frames (optional, for a speaking animation)

For the moods used most (`calm`, `happy`, `hello`, `loving`, `listening`), make the **same image with the mouth open mid-word**, named `<character>-<mood>-talk.png`. The app alternates the two while a character speaks.

### D. Occasions: one image per character for each occasion

Named `<character>-<occasion>.png` (for example `garnet-birthday.png`). Same character design, plus the outfit or props below. 14 occasions × 3 = 42 images.

| Occasion    | File suffix   | Props, pose and mood                                                                               |
| ----------- | ------------- | -------------------------------------------------------------------------------------------------- |
| Together    | `together`    | Holding a glowing pink-and-blue heart, blushing, loving smile                                      |
| Morning     | `morning`     | Holding a steaming mug (Sapphire half asleep, Ruby wide awake and grinning, Garnet calmly sipping) |
| Goodnight   | `goodnight`   | Wearing a cosy nightcap, sleepy eyes, holding a small pillow or star                               |
| Cozy        | `cozy`        | Wrapped in a soft blanket with a warm drink, content smile                                         |
| Birthday    | `birthday`    | Party hat, confetti in the hands, big cheer; Garnet also holds a wrapped gift                      |
| Anniversary | `anniversary` | Holding a single red rose, romantic blush, dreamy smile                                            |
| Open When   | `openWhen`    | Holding a sealed envelope with a heart seal close to the chest, hopeful smile                      |
| Memory      | `memory`      | Holding an instant photo and smiling fondly at it                                                  |
| Surprise    | `surprise`    | Holding a wrapped gift box with a bow, delighted surprised face                                    |
| Reunion     | `reunion`     | With a small suitcase and a heart balloon, jumping for joy (Ruby the most excited)                 |
| Celebration | `celebration` | Cheering with streamers; Garnet wears a small golden crown                                         |
| Spark       | `spark`       | Holding a small glowing warm-orange spark of light in cupped hands, proud and happy                |
| Music       | `music`       | Wearing headphones, dancing to the beat, eyes closed, music notes around                           |
| Winter      | `winter`      | Wearing a cosy red striped scarf and mittens, catching a snowflake, rosy cheeks                    |

### E. Fusion (the big moment)

```text
F-01  fusion.gif  (or fusion.webp)
A short animated loop, 3 seconds, same green background. Ruby and Sapphire face each other,
take both hands and do their graceful fusion dance: Ruby lifts Sapphire and they spin together,
Sapphire's skirt flaring and Ruby's grin wide. They glow brighter and brighter in white light,
their silhouettes merge into one tall shining shape, and the light settles to reveal Garnet,
who opens her arms with a calm, warm smile. Cinematic, exactly like the fusion sequences in
Steven Universe: The Movie. Centred, full bodies, nothing cut off.

F-02  unfusion.gif  (or unfusion.webp)
Garnet glows white, the light splits gently in two, and Ruby and Sapphire appear holding hands,
smiling at each other, Ruby blushing.

F-03  fusion-still.png
One still image of the moment of fusion: Ruby and Sapphire spinning hand in hand, wrapped in
glowing light, about to become Garnet.
```

If Gemini can't make animations, make **video clips** with Gemini's video tool (Veo) using the same text, and save them as `.mp4` in `incoming/`. Converting video to an animation needs a small tool (ffmpeg). Claude will ask before installing it.

### F. Funny and emotional extras (optional, great for empty states and celebrations)

Named exactly as shown. Each is a single character unless stated.

| File                              | Shot                                                                                |
| --------------------------------- | ----------------------------------------------------------------------------------- |
| `ruby-silly-cozy.png`             | Ruby tangled in a blanket, only her hair and a grin poking out                      |
| `sapphire-laughing-morning.png`   | Sapphire giggling behind her glove, her hair extra fluffy from sleep, holding a mug |
| `garnet-sneaky-surprise.png`      | Garnet hiding a gift behind her back, visor glinting, tiny smirk                    |
| `ruby-dancing-music.png`          | Ruby air-guitar dancing with headphones, hair bouncing                              |
| `sapphire-dreamy-openWhen.png`    | Sapphire floating, holding a letter to her heart, hearts drifting up                |
| `garnet-laughing-celebration.png` | Garnet laughing out loud, visor tilted, confetti in her hair                        |
| `ruby-loving-anniversary.png`     | Ruby holding a rose almost as big as she is, blushing                               |
| `sapphire-hug-cozy.png`           | Sapphire hugging a big soft pillow, content smile                                   |

---

## Naming reference

The app looks for the most specific image first:

1. `<character>-<mood>-<occasion>-talk` (while speaking)
2. `<character>-<mood>-talk` (while speaking)
3. `<character>-<mood>-<occasion>`
4. `<character>-<occasion>`
5. `<character>-<mood>`
6. `<character>` (the default)

Characters: `ruby`, `sapphire`, `garnet`.
Moods: `calm`, `happy`, `joyful`, `loving`, `hello`, `hug`, `thinking`, `listening`, `sleepy`, `proud`, `celebrating`, `shy`, `surprised`, `dreamy`, `laughing`, `silly`, `dancing`, `sneaky`.
Occasions: `everyday`, `together`, `morning`, `goodnight`, `cozy`, `birthday`, `anniversary`, `openWhen`, `memory`, `surprise`, `reunion`, `celebration`, `spark`, `music`, `winter`.
Fusion: `fusion`, `unfusion`.
