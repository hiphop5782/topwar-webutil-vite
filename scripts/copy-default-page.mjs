import { copyFile } from "node:fs/promises";
import path from "node:path";

const source = path.resolve("dist/ko/index.html");
const target = path.resolve("dist/index.html");

await copyFile(source, target);

console.log("기본 한국어 페이지를 루트 index.html로 복사했습니다.");