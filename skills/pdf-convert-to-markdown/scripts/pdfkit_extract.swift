#!/usr/bin/env swift

import Foundation
import PDFKit

guard CommandLine.arguments.count == 3 else {
    FileHandle.standardError.write(
        Data("usage: pdfkit_extract.swift SOURCE_PDF PAGES_DIRECTORY\n".utf8)
    )
    exit(2)
}

let sourceURL = URL(fileURLWithPath: CommandLine.arguments[1])
let pagesURL = URL(fileURLWithPath: CommandLine.arguments[2], isDirectory: true)
let fileManager = FileManager.default

guard let document = PDFDocument(url: sourceURL) else {
    FileHandle.standardError.write(Data("could not open source PDF\n".utf8))
    exit(1)
}

try fileManager.createDirectory(
    at: pagesURL,
    withIntermediateDirectories: true,
    attributes: nil
)

var records: [[String: Any]] = []

for index in 0..<document.pageCount {
    guard let page = document.page(at: index) else {
        FileHandle.standardError.write(Data("missing PDFKit page \(index + 1)\n".utf8))
        exit(1)
    }
    let text = page.string ?? ""
    let pageID = String(format: "p%04d", index + 1)
    let destination = pagesURL.appendingPathComponent("\(pageID).native-c-pdfkit.txt")
    try Data(text.utf8).write(to: destination, options: .atomic)
    records.append([
        "page": index + 1,
        "characters": text.count,
        "utf8_bytes": text.utf8.count,
    ])
    if (index + 1) % 50 == 0 || index + 1 == document.pageCount {
        print("pdfkit: \(index + 1)/\(document.pageCount)")
        fflush(stdout)
    }
}

let report: [String: Any] = [
    "schema_version": 1,
    "engine": "macOS PDFKit",
    "page_count": document.pageCount,
    "pages": records,
]
let reportData = try JSONSerialization.data(
    withJSONObject: report,
    options: [.prettyPrinted, .sortedKeys]
)
let reportURL = pagesURL.deletingLastPathComponent()
    .appendingPathComponent("pdfkit-extraction.json")
try reportData.write(to: reportURL, options: .atomic)
