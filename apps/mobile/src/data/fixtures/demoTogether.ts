/**
 * Demo plans, places and songs for Our World (prompt 13). Fictional; dates relative to today in
 * whole days so a demo reset restores exactly the same lists.
 */
import { Temporal } from "temporal-polyfill";
import type { PlaceRecord, PlanRecord, SongRecord } from "@/domain/together";

export interface DemoTogetherState {
  plans: PlanRecord[];
  places: PlaceRecord[];
  songs: SongRecord[];
}

export function createDemoTogether(
  meId: string,
  partnerId: string,
  today: Temporal.PlainDate = Temporal.Now.plainDateISO("UTC"),
): DemoTogetherState {
  const day = (n: number) => today.add({ days: n }).toString();
  const at = (n: number) =>
    today
      .add({ days: n })
      .toZonedDateTime({ timeZone: "UTC", plainTime: "10:00" })
      .toInstant()
      .toString();
  return {
    plans: [
      {
        id: "plan-first-date",
        authorId: partnerId,
        title: "Recreate our first date",
        note: "Same café, same table, same terrible coffee.",
        theme: "Little things",
        art: "coffee",
        place: "Addis Ababa",
        when: { type: "range", from: day(40), to: day(70) },
        doneAt: null,
      },
      {
        id: "plan-sea",
        authorId: meId,
        title: "Watch the sunrise by the sea",
        note: "Bring the big blanket.",
        theme: "Travel",
        art: "sea",
        place: "Brighton",
        when: { type: "date", date: day(52) },
        doneAt: null,
      },
      {
        id: "plan-cook",
        authorId: meId,
        title: "Cook doro wat together",
        note: "You chop, I sing.",
        theme: "Food",
        art: null,
        place: "",
        when: { type: "someday" },
        doneAt: null,
      },
      {
        id: "plan-museum",
        authorId: partnerId,
        title: "A rainy museum afternoon",
        note: "",
        theme: "Adventure",
        art: "city",
        place: "London",
        when: { type: "someday" },
        doneAt: day(-120),
      },
    ],
    places: [
      {
        id: "place-bridge",
        authorId: partnerId,
        name: "The river bridge",
        note: "Where I called you the night of the storm.",
        art: "night",
        date: day(-9),
      },
      {
        id: "place-cafe",
        authorId: meId,
        name: "Tomoca, Piazza",
        note: "Ordered your coffee too, out of habit.",
        art: "coffee",
        date: day(-4),
      },
      {
        id: "place-garden",
        authorId: meId,
        name: "Entoto park",
        note: "Saw a bird the colour of your scarf.",
        art: "garden",
        date: day(-21),
      },
    ],
    songs: [
      {
        id: "song-airport",
        authorId: meId,
        title: "Our airport song",
        artist: "The Departures",
        link: "https://music.example/track/airport",
        note: "I listened to this on the way home and thought of you.",
        addedAt: at(-30),
      },
      {
        id: "song-rain",
        authorId: partnerId,
        title: "Slow Rain",
        artist: "Meadowlight",
        link: "https://music.example/track/slow-rain",
        note: "For your long Tuesdays.",
        addedAt: at(-6),
      },
    ],
  };
}
