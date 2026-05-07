//
//  AppInfo.swift
//

import Foundation
import UIKit

public enum AppInfo {
    public static var versionString: String {
        let v = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "0.0.0"
        let b = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "0"
        return "\(v) (\(b))"
    }

    public static var deviceModel: String {
        var systemInfo = utsname()
        uname(&systemInfo)
        let mirror = Mirror(reflecting: systemInfo.machine)
        let identifier = mirror.children.reduce("") { partial, element in
            guard let value = element.value as? Int8, value != 0 else { return partial }
            return partial + String(UnicodeScalar(UInt8(value)))
        }
        return identifier
    }
}

/// Tiny ULID generator used for run ids + idempotency keys.
public struct ULID: Sendable, Hashable {
    public let stringValue: String

    public init() {
        // Crockford base32 alphabet
        let alphabet = Array("0123456789ABCDEFGHJKMNPQRSTVWXYZ")
        var result = ""
        // 48-bit timestamp ms
        var ts = UInt64(Date().timeIntervalSince1970 * 1000)
        var tsChars = [Character](repeating: "0", count: 10)
        for i in (0..<10).reversed() {
            tsChars[i] = alphabet[Int(ts & 0x1F)]
            ts >>= 5
        }
        result += String(tsChars)
        // 80-bit randomness
        var bytes = [UInt8](repeating: 0, count: 16)
        _ = SecRandomCopyBytes(kSecRandomDefault, 16, &bytes)
        var randomChars = [Character](repeating: "0", count: 16)
        for i in 0..<16 {
            randomChars[i] = alphabet[Int(bytes[i] & 0x1F)]
        }
        result += String(randomChars)
        self.stringValue = result
    }
}
