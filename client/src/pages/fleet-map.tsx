import { Layout } from "@/components/layout/Layout";
import { useQuery } from "@tanstack/react-query";
import { deviceApi, Device } from "@/lib/api";
import { Loader } from "@/components/loader";
import LeafletDeviceMap from "@/components/LeafletDeviceMap";
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

export default function FleetMap() {
  const { data: devices = [], isLoading } = useQuery<Device[]>({
    queryKey: ["devices"],
    queryFn: deviceApi.getAll,
  });

  if (isLoading) {
    return (
      <Layout title="Fleet Map">
        <div className="flex h-[50vh] items-center justify-center">
          <Loader />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Fleet Map">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        <motion.div variants={item}>
          <LeafletDeviceMap devices={devices} />
        </motion.div>
      </motion.div>
    </Layout>
  );
}
