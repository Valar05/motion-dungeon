import type {Metadata} from "next";
import sceneDocument from "../../../projects/lexen-cage-with-glass-walls.json";
import SourceLockedScene from "./source-locked-scene";
import "./lexen-scene.css";

export const metadata: Metadata = {
  title: "Lexen · The Cage With Glass Walls · Motion Dungeon",
  description: "A source-locked Motion Dungeon carrier for Lexen Vigil’s accepted take 8 performance.",
};

export default function LexenCagePage() {
  return <SourceLockedScene initialDocument={sceneDocument}/>;
}
