import { Layout } from "@/components/layout/Layout";
import { useQuery } from "@tanstack/react-query";
import { deviceApi, Device } from "@/lib/api";
import { Loader } from "@/components/loader";
import { LiveSerialMonitor } from "@/components/LiveSerialMonitor";
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

export default function SerialMonitor() {
  const { data: devices = [], isLoading } = useQuery<Device[]>({
    queryKey: ["devices"],
    queryFn: deviceApi.getAll,
  });

  if (isLoading) {
    return (
      <Layout title="Serial Monitor">
        <div className="flex h-[50vh] items-center justify-center">
          <Loader />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Serial Monitor">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        <motion.div variants={item}>
          <LiveSerialMonitor devices={devices} />
        </motion.div>
      </motion.div>
    </Layout>
  );
}
