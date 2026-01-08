import { Layout } from "@/components/layout/Layout";
import { FirmwareDiffViewer } from "@/components/FirmwareDiffViewer";
import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

export default function FirmwareDiff() {
  return (
    <Layout title="Firmware Diff">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        <motion.div variants={item}>
          <FirmwareDiffViewer />
        </motion.div>
      </motion.div>
    </Layout>
  );
}
