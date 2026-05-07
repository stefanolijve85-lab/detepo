//
//  RunHistoryStore.swift
//
//  Local persistence of the last 100 runs. Backed by an on-disk JSON ring;
//  in production this is GRDB/SQLite for query speed.
//

import Foundation

@MainActor
final class RunHistoryStore {
    private(set) var runs: [RunSummary] = []
    private let limit = 100
    private let url: URL

    private init() {
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        self.url = docs.appendingPathComponent("run_history.json")
        if let data = try? Data(contentsOf: url),
           let decoded = try? JSONDecoder.iso8601.decode([RunSummary].self, from: data) {
            self.runs = decoded
        }
    }

    static func live() -> RunHistoryStore { RunHistoryStore() }

    func append(_ run: RunSummary) async {
        runs.insert(run, at: 0)
        if runs.count > limit { runs = Array(runs.prefix(limit)) }
        await persist()
    }

    private func persist() async {
        let data = (try? JSONEncoder.iso8601.encode(runs)) ?? Data()
        try? data.write(to: url, options: .atomic)
    }
}
