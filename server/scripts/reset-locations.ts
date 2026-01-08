import { storage } from "../storage";
import logger from "../logger";

async function run() {
  try {
    const devices = await storage.getDevices();
    logger.info(`Resetting locations for ${devices.length} devices...`);
    
    for (const device of devices) {
      await storage.updateDevice(device.id, {
        latitude: null,
        longitude: null,
        location: null
      });
    }
    
    logger.info("Successfully reset all device locations.");
    process.exit(0);
  } catch (error) {
    logger.error("Failed to reset device locations:", error);
    process.exit(1);
  }
}

run();
