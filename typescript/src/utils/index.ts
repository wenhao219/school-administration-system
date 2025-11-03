import fs from "fs";
import csv from "csv-parser";
import { CsvItem } from "../types/CsvItem";

export const convertCsvToJson = (filePath: string): Promise<CsvItem[]> => {
  const results: CsvItem[] = [];
  const stream = fs.createReadStream(filePath).pipe(csv());

  return new Promise((resolve, reject) => {
    stream.on("data", (data: CsvItem) => results.push(data));
    stream.on("end", () => resolve(results));
    stream.on("error", (err) => reject(err));
  });
};
