//
// GarnetWidgetProvider.swift
// TimelineProvider for Garnet WidgetKit Widgets
//

import WidgetKit
import SwiftUI

struct GarnetTimelineProvider: TimelineProvider {
    let appGroup = "group.app.garnet.prototype"
    let snapshotKey = "garnet_widget_snapshot_v1"

    func placeholder(in context: Context) -> GarnetEntry {
        GarnetEntry(date: Date(), snapshot: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (GarnetEntry) -> ()) {
        let entry = GarnetEntry(date: Date(), snapshot: loadSnapshot())
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<GarnetEntry>) -> ()) {
        let currentSnapshot = loadSnapshot()
        let currentDate = Date()
        
        // Refresh every 30 minutes or on major diurnal boundary
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: currentDate) ?? currentDate.addingTimeInterval(1800)
        let entry = GarnetEntry(date: currentDate, snapshot: currentSnapshot)
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    private func loadSnapshot() -> WidgetSnapshotData? {
        guard let sharedDefaults = UserDefaults(suiteName: appGroup),
              let jsonString = sharedDefaults.string(forKey: snapshotKey),
              let data = jsonString.data(using: .utf8) else {
            return nil
        }
        return try? JSONDecoder().decode(WidgetSnapshotData.self, from: data)
    }
}

@main
struct GarnetWidgetBundle: WidgetBundle {
    var body: some Widget {
        SmartGlanceWidget()
        LockScreenWidget()
    }
}

struct SmartGlanceWidget: Widget {
    let kind: String = "SmartGlance"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: GarnetTimelineProvider()) { entry in
            SmartGlanceWidgetView(entry: entry)
        }
        .configurationDisplayName("Smart Glance")
        .description("Context-aware glance combining diurnal rhythm and emotional warmth.")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}

struct LockScreenWidget: Widget {
    let kind: String = "LockScreenAccessory"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: GarnetTimelineProvider()) { entry in
            LockScreenAccessoryView(entry: entry)
        }
        .configurationDisplayName("Garnet Glance")
        .description("Privacy-first glance on your Lock Screen.")
        .supportedFamilies([.accessoryCircular, .accessoryRectangular])
    }
}

