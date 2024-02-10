//
//  Item.swift
//  clippy
//
//  Created by Sean Lee on 12/7/23.
//

import Foundation
import SwiftData

@Model
final class Item {
    var timestamp: Date
    
    init(timestamp: Date) {
        self.timestamp = timestamp
    }
}
