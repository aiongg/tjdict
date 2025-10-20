#!/usr/bin/env tsx
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var url_1 = require("url");
var __filename = (0, url_1.fileURLToPath)(import.meta.url);
var __dirname = path.dirname(__filename);
// Generate SQL UPDATE statements from entries.json
function generateSqlUpdates() {
    return __awaiter(this, void 0, void 0, function () {
        var dataDir, inputFile, outputFile, content, entries, sqlStatements, _i, entries_1, entry, entryData, headNumber, escapedHead, escapedSortKey;
        return __generator(this, function (_a) {
            dataDir = path.join(__dirname, '..', 'data');
            inputFile = path.join(dataDir, 'entries.json');
            outputFile = path.join(dataDir, 'update-sort-keys.sql');
            console.log('Reading entries.json...');
            if (!fs.existsSync(inputFile)) {
                console.error("ERROR: ".concat(inputFile, " does not exist"));
                console.error('Please run migrate-yaml-to-json.ts first to generate entries.json');
                process.exit(1);
            }
            content = fs.readFileSync(inputFile, 'utf-8');
            entries = JSON.parse(content);
            console.log("Found ".concat(entries.length, " entries"));
            console.log("Generating SQL UPDATE statements to ".concat(outputFile, "..."));
            sqlStatements = [
                "-- Update sort keys for all dictionary entries",
                "-- Generated: ".concat(new Date().toISOString()),
                "-- Total entries: ".concat(entries.length),
                "",
                "-- This file updates the sort_key column to use syllable-aware, tone-aware sorting",
                "",
            ];
            for (_i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
                entry = entries_1[_i];
                entryData = JSON.parse(entry.entry_data);
                headNumber = entryData.head_number;
                escapedHead = entry.head.replace(/'/g, "''");
                escapedSortKey = entry.sort_key.replace(/'/g, "''");
                // Generate UPDATE statement
                // Match by head and head_number (or NULL if no head_number)
                if (headNumber !== undefined && headNumber !== null) {
                    sqlStatements.push("UPDATE entries SET sort_key = '".concat(escapedSortKey, "' WHERE head = '").concat(escapedHead, "' AND head_number = ").concat(headNumber, ";"));
                }
                else {
                    sqlStatements.push("UPDATE entries SET sort_key = '".concat(escapedSortKey, "' WHERE head = '").concat(escapedHead, "' AND head_number IS NULL;"));
                }
            }
            // Write SQL file
            fs.writeFileSync(outputFile, sqlStatements.join('\n'));
            console.log("\nSuccessfully generated ".concat(outputFile));
            console.log("Total UPDATE statements: ".concat(entries.length));
            console.log("\nTo apply these changes to your database, run:");
            console.log("  wrangler d1 execute prod_tjdict --file=data/update-sort-keys.sql");
            console.log("\nOr on your production server, execute the SQL file directly.");
            return [2 /*return*/];
        });
    });
}
// Run the script
generateSqlUpdates().catch(function (error) {
    console.error('Failed to generate SQL updates:', error);
    process.exit(1);
});
