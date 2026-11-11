import { MotionConfig, motion } from "motion/react";
import { duration, ease } from "../lib/motion";

// Example React island: hydrated from an .astro page with a client:* directive.
export default function Hello() {
  return (
    <MotionConfig reducedMotion="user">
      <motion.h1
        className="text-4xl font-semibold tracking-tight"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: duration.slow, ease: ease.out }}
      >
        Kelly Su
      </motion.h1>
    </MotionConfig>
  );
}
