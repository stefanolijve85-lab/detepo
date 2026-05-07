//
//  CloudSaveService.swift
//
//  Mirrors the local profile snapshot to CloudKit private DB. Idempotent +
//  "last-write-wins" on the cosmetic equip state, server-authoritative on
//  currency.
//

import Foundation
import CloudKit

@MainActor
final class CloudSaveService {
    private let container = CKContainer.default()
    private var profileStore: ProfileStore

    init(profileStore: ProfileStore) {
        self.profileStore = profileStore
    }

    func reconcile() async {
        // Load remote, compare timestamps, write whichever is newer + push
        // server-authoritative currency back into local profile.
        // Stubbed; production uses CKModifyRecordsOperation + custom zone.
    }

    func flush() async {
        // Persist a snapshot to CloudKit. Background-friendly.
    }
}
