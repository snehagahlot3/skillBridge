import { registerRoot } from "remotion";
import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { RemotionRoot } from "./Root";

// Brand fonts, downloaded once at build/render time.
loadFraunces("normal", { weights: ["600"], subsets: ["latin"] });
loadInter("normal", { weights: ["400", "600"], subsets: ["latin"] });

registerRoot(RemotionRoot);