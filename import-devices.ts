import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { devices } from "./shared/schema";
import { sql } from "drizzle-orm";

// Database configuration
const DB_HOST = process.env.DB_HOST || "15.206.156.197";
const DB_PORT = parseInt(process.env.DB_PORT || "3306");
const DB_USER = process.env.DB_USER || "satya";
const DB_PASSWORD = process.env.DB_PASSWORD || "satya123";
const DB_NAME = process.env.DB_NAME || "ota_db";

// Create database connection
const pool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

const db = drizzle(pool);

// Map ambulance_type to group name
const ambulanceTypeMap: Record<number, string> = {
  1: "ALS",
  2: "BLS_LARGE", 
  3: "BLS_MINI",
  4: "BLS_MICRO",
  5: "HEARSE_VAN"
};

// Data from products SQL file
const productsData = [
  { sl_no: 1, mac_id: '3C8A1F3A0090', ambulance_dumy_name: 'KHUM_7415', ambulance_type: 4, is_online: 0, last_active_time: '2025-11-17 20:36:30' },
  { sl_no: 2, mac_id: '3C8A1F3A8CA8', ambulance_dumy_name: 'KHUM_4707', ambulance_type: 4, is_online: 0, last_active_time: '2025-11-19 08:50:26' },
  { sl_no: 3, mac_id: '3C8A1F3AAC34', ambulance_dumy_name: 'KHUM_6428', ambulance_type: 4, is_online: 0, last_active_time: '2025-09-29 18:22:55' },
  { sl_no: 4, mac_id: '3C8A1F3A8DA0', ambulance_dumy_name: 'KHUM_2851', ambulance_type: 4, is_online: 0, last_active_time: '2025-12-05 15:16:56' },
  { sl_no: 5, mac_id: '3C8A1F3A6378', ambulance_dumy_name: 'KHUM_3562', ambulance_type: 4, is_online: 0, last_active_time: '2025-11-20 10:32:29' },
  { sl_no: 6, mac_id: '3C8A1F39D43C', ambulance_dumy_name: 'KHUM_4723', ambulance_type: 4, is_online: 0, last_active_time: '2025-12-06 11:51:22' },
  { sl_no: 7, mac_id: '3C8A1F39DAF4', ambulance_dumy_name: 'KHUM_2315', ambulance_type: 4, is_online: 0, last_active_time: '2025-12-03 17:48:40' },
  { sl_no: 8, mac_id: '3C8A1F3BC294', ambulance_dumy_name: 'KHUM_2420', ambulance_type: 4, is_online: 0, last_active_time: '2025-09-26 17:56:34' },
  { sl_no: 9, mac_id: '3C8A1F39DB5C', ambulance_dumy_name: 'VIVEK_9063', ambulance_type: 4, is_online: 0, last_active_time: '2025-09-02 05:52:19' },
  { sl_no: 10, mac_id: '3C8A1F3A0A68', ambulance_dumy_name: 'VIVEK_2544', ambulance_type: 4, is_online: 0, last_active_time: '2025-11-17 16:50:41' },
  { sl_no: 11, mac_id: '3C8A1F3B918C', ambulance_dumy_name: 'VIVEK_0183', ambulance_type: 4, is_online: 0, last_active_time: '2025-12-08 06:51:15' },
  { sl_no: 12, mac_id: '3C8A1F3A9D34', ambulance_dumy_name: 'MANIPAL_7119', ambulance_type: 4, is_online: 0, last_active_time: '2025-09-02 18:28:29' },
  { sl_no: 13, mac_id: '3C8A1F3A6AF4', ambulance_dumy_name: 'MANIPAL_1098', ambulance_type: 4, is_online: 0, last_active_time: '2025-09-22 04:57:30' },
  { sl_no: 14, mac_id: '3C8A1F3B9788', ambulance_dumy_name: 'AIIMS_1418', ambulance_type: 4, is_online: 0, last_active_time: '2025-08-19 01:25:49' },
  { sl_no: 15, mac_id: '3C8A1F3A6380', ambulance_dumy_name: 'AIIMS_6286', ambulance_type: 4, is_online: 0, last_active_time: '2025-09-11 14:53:23' },
  { sl_no: 16, mac_id: '3C8A1F3A8A70', ambulance_dumy_name: 'AIIMS_3479', ambulance_type: 4, is_online: 0, last_active_time: '2025-09-23 18:43:35' },
  { sl_no: 17, mac_id: '3C8A1F3B25E0', ambulance_dumy_name: 'AIIMS_3713', ambulance_type: 4, is_online: 0, last_active_time: '2025-11-21 08:35:15' },
  { sl_no: 18, mac_id: '3C8A1F3AB658', ambulance_dumy_name: 'AIIMS_9967', ambulance_type: 4, is_online: 0, last_active_time: '2025-07-24 19:55:28' },
  { sl_no: 19, mac_id: '3C8A1F3B309C', ambulance_dumy_name: 'INDE_3715', ambulance_type: 4, is_online: 0, last_active_time: '2025-11-04 13:17:27' },
  { sl_no: 20, mac_id: '3C8A1F3A0F5C', ambulance_dumy_name: 'INDE_1893', ambulance_type: 3, is_online: 0, last_active_time: '2025-11-23 21:44:56' },
  { sl_no: 21, mac_id: '3C8A1F3A7D48', ambulance_dumy_name: 'INDE_0012', ambulance_type: 3, is_online: 0, last_active_time: '2025-11-08 11:13:15' },
  { sl_no: 22, mac_id: '3C8A1F3BA8B0', ambulance_dumy_name: 'INDE_3812', ambulance_type: 3, is_online: 0, last_active_time: '2025-09-26 16:04:48' },
  { sl_no: 23, mac_id: '3C8A1F3A52FC', ambulance_dumy_name: 'VIVEKA_1444', ambulance_type: 4, is_online: 0, last_active_time: '2025-12-08 06:49:20' },
  { sl_no: 24, mac_id: '3C8A1F3B53C8', ambulance_dumy_name: 'KIDS_6267', ambulance_type: 3, is_online: 0, last_active_time: '2025-11-30 15:12:11' },
  { sl_no: 25, mac_id: '3C8A1F3ACA28', ambulance_dumy_name: 'AIIMS_3753', ambulance_type: 4, is_online: 0, last_active_time: '2025-08-01 12:57:13' },
  { sl_no: 26, mac_id: '3C8A1F39FC74', ambulance_dumy_name: 'AIIMS_9020', ambulance_type: 4, is_online: 0, last_active_time: '2025-07-16 17:32:22' },
  { sl_no: 27, mac_id: '3C8A1F3AB518', ambulance_dumy_name: 'AIIMS_3793', ambulance_type: 4, is_online: 0, last_active_time: '2025-12-24 06:02:40' },
  { sl_no: 28, mac_id: '3C8A1F3A301C', ambulance_dumy_name: 'AIIMS_4202', ambulance_type: 3, is_online: 0, last_active_time: '2025-09-04 16:58:17' },
  { sl_no: 29, mac_id: '3C8A1F3A4EB4', ambulance_dumy_name: 'INDE_5442', ambulance_type: 4, is_online: 0, last_active_time: '2025-11-24 17:47:49' },
  { sl_no: 30, mac_id: '3C8A1F3A34CC', ambulance_dumy_name: 'KIIMS_4515', ambulance_type: 3, is_online: 0, last_active_time: '2025-11-20 09:12:20' },
  { sl_no: 31, mac_id: '3C8A1F3B4AAC', ambulance_dumy_name: 'HITECH_8109', ambulance_type: 4, is_online: 0, last_active_time: '2025-11-19 05:47:00' },
  { sl_no: 32, mac_id: '3C8A1F3A31EC', ambulance_dumy_name: 'INDE_4761', ambulance_type: 4, is_online: 0, last_active_time: '2025-11-28 18:04:23' },
  { sl_no: 33, mac_id: '3C8A1F3B2CD0', ambulance_dumy_name: 'CARE_7542', ambulance_type: 1, is_online: 0, last_active_time: '2025-12-08 06:51:23' },
  { sl_no: 34, mac_id: '3C8A1F3A3D68', ambulance_dumy_name: 'CARE_6155', ambulance_type: 4, is_online: 0, last_active_time: '2025-11-07 05:37:50' },
  { sl_no: 35, mac_id: '3C8A1F39CF3C', ambulance_dumy_name: 'CARE_4878', ambulance_type: 4, is_online: 0, last_active_time: '2025-11-14 00:08:11' },
  { sl_no: 36, mac_id: '3C8A1F3A6BC8', ambulance_dumy_name: 'ASHWINI_8366', ambulance_type: 4, is_online: 0, last_active_time: '2025-09-04 12:29:15' },
  { sl_no: 37, mac_id: '3C8A1F3B778C', ambulance_dumy_name: 'ASHWINI1218', ambulance_type: 4, is_online: 0, last_active_time: '2025-11-02 01:21:24' },
  { sl_no: 38, mac_id: '3C8A1F3B6FB0', ambulance_dumy_name: 'ASHWINI8343', ambulance_type: 4, is_online: 0, last_active_time: '2025-07-20 04:38:16' },
  { sl_no: 39, mac_id: '3C8A1F3B3CF0', ambulance_dumy_name: 'ASHWINI_5167', ambulance_type: 3, is_online: 0, last_active_time: '2025-11-02 02:37:20' },
  { sl_no: 40, mac_id: '3C8A1F3B290C', ambulance_dumy_name: 'ASHWINI_3396', ambulance_type: 3, is_online: 0, last_active_time: '2025-09-05 14:50:47' },
  { sl_no: 41, mac_id: '3C8A1F3B6A30', ambulance_dumy_name: 'SCB_5284', ambulance_type: 4, is_online: 0, last_active_time: '2025-08-30 21:02:32' },
  { sl_no: 42, mac_id: '3C8A1F3B9328', ambulance_dumy_name: 'SCB_4286', ambulance_type: 4, is_online: 0, last_active_time: '2025-08-16 06:57:51' },
  { sl_no: 43, mac_id: '3C8A1F3B5638', ambulance_dumy_name: 'SCB_4831', ambulance_type: 1, is_online: 0, last_active_time: '2025-08-30 10:41:26' },
  { sl_no: 44, mac_id: '3C8A1F3AF79C', ambulance_dumy_name: 'SCB_2129', ambulance_type: 3, is_online: 0, last_active_time: '2025-11-20 15:18:33' },
  { sl_no: 45, mac_id: '3C8A1F3B437C', ambulance_dumy_name: 'SCB_2707', ambulance_type: 3, is_online: 0, last_active_time: '2025-09-01 14:00:19' },
  { sl_no: 46, mac_id: '3C8A1F3B3734', ambulance_dumy_name: 'SCB_1953', ambulance_type: 4, is_online: 0, last_active_time: '2025-08-23 06:02:46' },
  { sl_no: 47, mac_id: '3C8A1F3A7444', ambulance_dumy_name: 'KIIMS_0471', ambulance_type: 4, is_online: 0, last_active_time: '2025-11-27 14:21:09' },
  { sl_no: 48, mac_id: '3C8A1F3A6C58', ambulance_dumy_name: 'INDE_6820', ambulance_type: 4, is_online: 0, last_active_time: '2025-09-25 19:43:56' },
  { sl_no: 49, mac_id: '3C8A1F3A3818', ambulance_dumy_name: 'INDE_8032', ambulance_type: 4, is_online: 0, last_active_time: '2025-09-18 06:28:40' },
  { sl_no: 50, mac_id: '3C8A1F3B5C14', ambulance_dumy_name: 'KIMS_3676', ambulance_type: 4, is_online: 0, last_active_time: '2025-10-29 05:33:37' },
  { sl_no: 51, mac_id: '3C8A1F3A5D78', ambulance_dumy_name: 'CARE_6212', ambulance_type: 3, is_online: 0, last_active_time: '2025-11-26 10:13:09' },
  { sl_no: 52, mac_id: '3C8A1F3B4578', ambulance_dumy_name: 'INDE_2776', ambulance_type: 4, is_online: 0, last_active_time: '2025-08-07 11:58:13' },
  { sl_no: 53, mac_id: '3C8A1F3B697C', ambulance_dumy_name: 'SUNSHINE_9029', ambulance_type: 1, is_online: 0, last_active_time: '2025-12-08 06:51:23' },
  { sl_no: 54, mac_id: '3C8A1F3B3108', ambulance_dumy_name: 'SUNSHINE_3875', ambulance_type: 4, is_online: 0, last_active_time: '2025-12-02 06:59:38' },
  { sl_no: 55, mac_id: '3C8A1F3B68E8', ambulance_dumy_name: 'SUM_2095', ambulance_type: 4, is_online: 0, last_active_time: '2025-11-22 08:30:03' },
  { sl_no: 56, mac_id: '3C8A1F3B3B1C', ambulance_dumy_name: 'CAPITAL_9808', ambulance_type: 3, is_online: 0, last_active_time: '2025-12-08 06:51:32' },
  { sl_no: 57, mac_id: '3C8A1F3A5FAC', ambulance_dumy_name: 'SCB_0585', ambulance_type: 4, is_online: 0, last_active_time: '2025-09-01 10:44:04' },
  { sl_no: 58, mac_id: '3C8A1F3A6D50', ambulance_dumy_name: 'SCB_3143', ambulance_type: 4, is_online: 0, last_active_time: '2025-09-16 05:22:28' },
  { sl_no: 59, mac_id: '3C8A1F3A6730', ambulance_dumy_name: 'ASHWINI_0212', ambulance_type: 3, is_online: 0, last_active_time: '2025-10-30 11:28:42' },
  { sl_no: 60, mac_id: '3C8A1F3AC26C', ambulance_dumy_name: 'INDE_5668', ambulance_type: 1, is_online: 0, last_active_time: '2025-11-28 09:56:39' },
  { sl_no: 61, mac_id: '3C8A1F3A71A4', ambulance_dumy_name: 'KHU_6854', ambulance_type: 4, is_online: 0, last_active_time: '2025-12-04 01:20:34' },
  { sl_no: 62, mac_id: '3C8A1F3B2AF0', ambulance_dumy_name: 'AIIMS_3818', ambulance_type: 4, is_online: 0, last_active_time: '2025-11-05 06:42:47' },
  { sl_no: 63, mac_id: '3C8A1F3B2368', ambulance_dumy_name: 'SUM_2618', ambulance_type: 4, is_online: 0, last_active_time: '2025-11-09 23:17:56' },
  { sl_no: 64, mac_id: '3C8A1F3A71D8', ambulance_dumy_name: 'SUM_5042', ambulance_type: 4, is_online: 0, last_active_time: '2025-11-10 07:49:29' },
  { sl_no: 65, mac_id: '3C8A1F3B5530', ambulance_dumy_name: 'SUM_6694', ambulance_type: 4, is_online: 0, last_active_time: '2025-11-06 09:20:02' },
  { sl_no: 73, mac_id: '3C8A1F3B71E0', ambulance_dumy_name: 'SUM_0477', ambulance_type: 3, is_online: 0, last_active_time: '2025-10-19 09:30:28' },
  { sl_no: 74, mac_id: '8C4F00C4B650', ambulance_dumy_name: 'SUM_9288', ambulance_type: 4, is_online: 0, last_active_time: '2025-11-05 17:02:55' },
  { sl_no: 76, mac_id: '3C8A1F3B2C70', ambulance_dumy_name: 'MEDX_9470', ambulance_type: 4, is_online: 0, last_active_time: '2025-12-06 13:37:39' },
  { sl_no: 77, mac_id: '3C8A1F3B2B98', ambulance_dumy_name: 'INDE_9877', ambulance_type: 3, is_online: 0, last_active_time: '2025-11-27 13:19:59' },
  { sl_no: 78, mac_id: '3C8A1F3B5D6C', ambulance_dumy_name: 'SCB_7136', ambulance_type: 4, is_online: 0, last_active_time: '2025-09-04 10:22:11' },
  { sl_no: 79, mac_id: '3C8A1F3B2898', ambulance_dumy_name: 'SCB_2213', ambulance_type: 4, is_online: 0, last_active_time: '2025-11-27 05:47:55' },
  { sl_no: 80, mac_id: '3C8A1F3A6698', ambulance_dumy_name: 'ACB_6832', ambulance_type: 3, is_online: 0, last_active_time: '2025-09-23 13:10:41' },
  { sl_no: 81, mac_id: '3C8A1F3B5DEC', ambulance_dumy_name: 'SCB_9642', ambulance_type: 4, is_online: 0, last_active_time: '2025-09-12 09:42:41' },
  { sl_no: 82, mac_id: '3C8A1F3B6784', ambulance_dumy_name: 'SCB_3800', ambulance_type: 4, is_online: 0, last_active_time: '2025-09-11 05:55:29' },
  { sl_no: 83, mac_id: '3C8A1F3B4344', ambulance_dumy_name: 'SCB_4167', ambulance_type: 3, is_online: 0, last_active_time: '2025-09-12 17:39:42' },
  { sl_no: 84, mac_id: '3C8A1F3B6F74', ambulance_dumy_name: 'SCB_3364', ambulance_type: 1, is_online: 0, last_active_time: '2025-10-03 03:56:39' },
  { sl_no: 85, mac_id: '3C8A1F3A7894', ambulance_dumy_name: 'SCB_3513', ambulance_type: 1, is_online: 0, last_active_time: '2025-09-01 21:55:42' },
  { sl_no: 86, mac_id: '3C8A1F3A75D0', ambulance_dumy_name: 'SCB_8855', ambulance_type: 1, is_online: 0, last_active_time: '2025-08-07 21:48:04' },
  { sl_no: 87, mac_id: '3C8A1F3B6AD4', ambulance_dumy_name: 'SCB_0636', ambulance_type: 4, is_online: 0, last_active_time: '2025-10-02 05:17:25' },
  { sl_no: 88, mac_id: '3C8A1F3A500C', ambulance_dumy_name: 'SCB_9527', ambulance_type: 4, is_online: 0, last_active_time: '2025-08-15 17:48:31' },
  { sl_no: 89, mac_id: '3C8A1F3B2A30', ambulance_dumy_name: 'SCB_0400', ambulance_type: 4, is_online: 0, last_active_time: '2025-12-05 07:46:48' },
  { sl_no: 90, mac_id: '3C8A1F3B2A74', ambulance_dumy_name: 'SCB_246', ambulance_type: 4, is_online: 0, last_active_time: '2025-08-17 08:13:05' },
  { sl_no: 91, mac_id: '13772CDA', ambulance_dumy_name: 'SCB_355', ambulance_type: 3, is_online: 0, last_active_time: null },
  { sl_no: 92, mac_id: '3C8A1F3B5518', ambulance_dumy_name: 'SCB_6458', ambulance_type: 4, is_online: 0, last_active_time: '2025-09-24 09:00:05' },
  { sl_no: 93, mac_id: '3C8A1F3B7220', ambulance_dumy_name: 'SCB_9545', ambulance_type: 4, is_online: 0, last_active_time: '2025-09-02 17:16:39' },
  { sl_no: 94, mac_id: '3C8A1F3A5798', ambulance_dumy_name: 'SCB_5610', ambulance_type: 4, is_online: 0, last_active_time: '2025-11-03 18:28:30' },
  { sl_no: 95, mac_id: '3C8A1F3B57C4', ambulance_dumy_name: 'AIMS_2212', ambulance_type: 4, is_online: 0, last_active_time: '2025-09-11 18:59:28' },
  { sl_no: 96, mac_id: '3C8A1F3A63D8', ambulance_dumy_name: 'IGKC_3245', ambulance_type: 3, is_online: 0, last_active_time: '2025-11-29 15:00:27' },
  { sl_no: 97, mac_id: '3C8A1F3B75A4', ambulance_dumy_name: 'SUM_0864', ambulance_type: 4, is_online: 0, last_active_time: '2025-11-05 07:25:52' },
  { sl_no: 98, mac_id: '3C8A1F3A55D0', ambulance_dumy_name: 'CAPITAL_9399', ambulance_type: 3, is_online: 0, last_active_time: '2025-11-12 18:25:25' },
  { sl_no: 99, mac_id: '3C8A1F3B2354', ambulance_dumy_name: 'CAPITAL_2010', ambulance_type: 3, is_online: 0, last_active_time: '2025-11-12 16:12:11' },
  { sl_no: 100, mac_id: '3C8A1F3B27C0', ambulance_dumy_name: 'SUM_7378', ambulance_type: 3, is_online: 0, last_active_time: '2025-08-21 13:17:12' },
  { sl_no: 101, mac_id: '3C8A1F3B5274', ambulance_dumy_name: 'SCB_6522', ambulance_type: 4, is_online: 0, last_active_time: '2025-11-09 19:14:01' },
  { sl_no: 102, mac_id: '3C8A1F3B6F98', ambulance_dumy_name: 'BBSR_9906', ambulance_type: 4, is_online: 0, last_active_time: '2025-11-13 12:10:33' },
  { sl_no: 103, mac_id: '8C4F00C4D20C', ambulance_dumy_name: 'BBSR_8459', ambulance_type: 3, is_online: 0, last_active_time: '2025-11-13 11:14:42' },
  { sl_no: 104, mac_id: '3C8A1F3B9264', ambulance_dumy_name: 'BBSR_3554', ambulance_type: 3, is_online: 0, last_active_time: '2025-08-27 17:19:52' },
  { sl_no: 105, mac_id: '3C8A1F3B5524', ambulance_dumy_name: 'CUTTACK_0193', ambulance_type: 4, is_online: 0, last_active_time: '2025-08-21 18:50:35' },
  { sl_no: 106, mac_id: '3C8A1F3B26AC', ambulance_dumy_name: 'CUTTACK_2493', ambulance_type: 4, is_online: 0, last_active_time: '2025-11-29 12:20:51' },
  { sl_no: 107, mac_id: '3C8A1F3A6550', ambulance_dumy_name: 'CUTTACK_7124', ambulance_type: 4, is_online: 0, last_active_time: '2025-08-24 06:06:19' },
  { sl_no: 108, mac_id: '3C8A1F3A5DFC', ambulance_dumy_name: 'SCB_0410', ambulance_type: 4, is_online: 0, last_active_time: '2025-09-02 07:36:11' },
  { sl_no: 109, mac_id: '3C8A1F3B1FB4', ambulance_dumy_name: 'JAGATSINGHPUR_3418', ambulance_type: 4, is_online: 0, last_active_time: '2025-10-10 03:58:44' },
  { sl_no: 110, mac_id: '3C8A1F3B5E20', ambulance_dumy_name: 'JAGATSINGHPUR_5432', ambulance_type: 3, is_online: 0, last_active_time: '2025-09-03 16:28:21' },
  { sl_no: 111, mac_id: '3C8A1F3B2D84', ambulance_dumy_name: 'JAGATSINGHPUR_7806', ambulance_type: 4, is_online: 0, last_active_time: '2025-10-21 13:25:09' },
  { sl_no: 112, mac_id: '3C8A1F3A46B0', ambulance_dumy_name: 'JAGATSINGHPUR_1962', ambulance_type: 4, is_online: 0, last_active_time: '2025-12-01 03:09:57' },
  { sl_no: 113, mac_id: '3C8A1F3B2230', ambulance_dumy_name: 'JAGATSINGHPUR_3184', ambulance_type: 3, is_online: 0, last_active_time: '2025-09-07 22:34:32' },
  { sl_no: 114, mac_id: '3C8A1F3B5054', ambulance_dumy_name: 'JAGATSINGHPUR_0345', ambulance_type: 3, is_online: 0, last_active_time: '2025-09-30 16:46:39' },
  { sl_no: 115, mac_id: '3C8A1F3B203C', ambulance_dumy_name: 'JAGATSINGHPUR_3955', ambulance_type: 3, is_online: 0, last_active_time: '2025-12-06 14:40:07' },
  { sl_no: 116, mac_id: '3C8A1F3B5924', ambulance_dumy_name: 'SUM_1931', ambulance_type: 4, is_online: 0, last_active_time: '2025-11-13 21:34:38' },
  { sl_no: 117, mac_id: '3C8A1F3A42A0', ambulance_dumy_name: 'SCB_6971', ambulance_type: 4, is_online: 0, last_active_time: '2025-09-07 05:32:58' },
  { sl_no: 118, mac_id: '3C8A1F3A36C8', ambulance_dumy_name: 'SCB_2831', ambulance_type: 4, is_online: 0, last_active_time: '2025-09-06 05:54:08' },
  { sl_no: 119, mac_id: '3C8A1F3A9BAC', ambulance_dumy_name: 'SCB_3019', ambulance_type: 4, is_online: 0, last_active_time: '2025-09-04 19:35:43' },
  { sl_no: 120, mac_id: '3C8A1F3B3838', ambulance_dumy_name: 'SCB_3019_2', ambulance_type: 4, is_online: 0, last_active_time: '2025-09-04 20:26:16' },
  { sl_no: 121, mac_id: '3C8A1F3B1ECC', ambulance_dumy_name: 'SCB_4937', ambulance_type: 4, is_online: 0, last_active_time: '2025-11-26 21:43:14' },
  { sl_no: 122, mac_id: '3C8A1F3B5DFC', ambulance_dumy_name: 'SCB_6974', ambulance_type: 4, is_online: 0, last_active_time: '2025-09-04 22:43:59' },
  { sl_no: 123, mac_id: '3C8A1F3B45F4', ambulance_dumy_name: 'HITECH_1196', ambulance_type: 4, is_online: 0, last_active_time: '2025-11-04 14:50:50' },
  { sl_no: 124, mac_id: '3C8A1F3A788C', ambulance_dumy_name: 'HITECH_1188', ambulance_type: 4, is_online: 0, last_active_time: '2025-09-12 10:28:37' },
  { sl_no: 125, mac_id: '3C8A1F3B1F48', ambulance_dumy_name: 'HITECH_5060', ambulance_type: 4, is_online: 0, last_active_time: '2025-09-22 02:54:26' },
  { sl_no: 126, mac_id: '3C8A1F3A76D8', ambulance_dumy_name: 'HITECH_3945', ambulance_type: 4, is_online: 0, last_active_time: '2025-09-28 04:21:51' },
  { sl_no: 127, mac_id: '3C8A1F39DF68', ambulance_dumy_name: 'HITECH_9711', ambulance_type: 4, is_online: 0, last_active_time: '2025-10-01 05:35:19' },
  { sl_no: 128, mac_id: '3C8A1F39FBC4', ambulance_dumy_name: 'HITECH_3005', ambulance_type: 4, is_online: 0, last_active_time: '2025-09-26 07:17:21' },
  { sl_no: 129, mac_id: '3C8A1F3B3EB0', ambulance_dumy_name: 'HITECH_1596', ambulance_type: 4, is_online: 0, last_active_time: '2025-10-03 13:15:11' },
  { sl_no: 130, mac_id: '3C8A1F3A649C', ambulance_dumy_name: 'PURIGOV_7666', ambulance_type: 3, is_online: 0, last_active_time: '2025-11-09 08:15:24' },
  { sl_no: 131, mac_id: '3C8A1F3A9128', ambulance_dumy_name: 'PURIGOV_6353', ambulance_type: 3, is_online: 0, last_active_time: '2025-12-04 16:43:04' },
  { sl_no: 132, mac_id: '3C8A1F39DDC8', ambulance_dumy_name: 'PURIGOV_0989', ambulance_type: 4, is_online: 0, last_active_time: '2025-11-09 00:26:46' },
  { sl_no: 133, mac_id: '3C8A1F3B2B78', ambulance_dumy_name: 'AIIMS_2212', ambulance_type: 3, is_online: 0, last_active_time: '2025-09-11 19:12:59' },
  { sl_no: 134, mac_id: '3C8A1F3A40E8', ambulance_dumy_name: 'AIIMS_2212_2', ambulance_type: 4, is_online: 0, last_active_time: '2025-09-11 12:06:21' },
  { sl_no: 135, mac_id: '3C8A1F3A4BB4', ambulance_dumy_name: 'REMU_3096', ambulance_type: 3, is_online: 0, last_active_time: '2025-09-21 03:11:46' },
  { sl_no: 136, mac_id: '3C8A1F3BA9DC', ambulance_dumy_name: 'REMU_5035', ambulance_type: 3, is_online: 0, last_active_time: '2025-10-30 06:40:48' },
  { sl_no: 137, mac_id: '3C8A1F3B6F38', ambulance_dumy_name: 'REMU_1919', ambulance_type: 3, is_online: 0, last_active_time: '2025-12-08 06:32:04' },
  { sl_no: 138, mac_id: '3C8A1F3B4AF8', ambulance_dumy_name: 'REMU_0925', ambulance_type: 3, is_online: 0, last_active_time: '2025-12-06 03:47:50' },
  { sl_no: 139, mac_id: '3C8A1F3A7720', ambulance_dumy_name: 'SCB_4505', ambulance_type: 4, is_online: 0, last_active_time: '2025-10-16 01:37:14' },
  { sl_no: 140, mac_id: '3C8A1F3A55D8', ambulance_dumy_name: 'ASHWINI_2413', ambulance_type: 4, is_online: 0, last_active_time: '2025-10-17 18:11:36' },
  { sl_no: 141, mac_id: '3C8A1F3A5694', ambulance_dumy_name: 'HITECH_9419', ambulance_type: 4, is_online: 0, last_active_time: '2025-09-27 23:06:45' },
  { sl_no: 142, mac_id: '8C4F00C3EDDC', ambulance_dumy_name: 'HITECH_7619', ambulance_type: 3, is_online: 0, last_active_time: '2025-09-20 07:39:46' },
  { sl_no: 143, mac_id: '3C8A1F3B3A48', ambulance_dumy_name: 'Khorda_Govt', ambulance_type: 3, is_online: 0, last_active_time: '2025-11-21 02:31:17' },
  { sl_no: 144, mac_id: '3C8A1F3A714C', ambulance_dumy_name: 'Khurda_1917', ambulance_type: 4, is_online: 0, last_active_time: '2025-11-29 06:32:27' },
  { sl_no: 145, mac_id: '3C8A1F3B45C8', ambulance_dumy_name: 'SUNSHINE_5738', ambulance_type: 3, is_online: 0, last_active_time: '2025-09-28 08:28:33' },
  { sl_no: 146, mac_id: '3C8A1F3B28C4', ambulance_dumy_name: 'SCB_0840', ambulance_type: 4, is_online: 0, last_active_time: '2025-11-28 01:59:43' },
  { sl_no: 147, mac_id: '3C8A1F3A3414', ambulance_dumy_name: 'SCB_0108', ambulance_type: 3, is_online: 0, last_active_time: '2025-09-29 19:39:00' },
  { sl_no: 148, mac_id: '3C8A1F3B5548', ambulance_dumy_name: 'INDE_8247', ambulance_type: 4, is_online: 0, last_active_time: '2025-12-01 23:32:45' },
  { sl_no: 149, mac_id: '3C8A1F3B34B4', ambulance_dumy_name: 'SCB_4008', ambulance_type: 4, is_online: 0, last_active_time: '2025-09-30 16:13:39' },
  { sl_no: 150, mac_id: '3C8A1F39DB04', ambulance_dumy_name: 'SCB_0436', ambulance_type: 4, is_online: 0, last_active_time: '2025-10-06 15:03:17' },
  { sl_no: 151, mac_id: '3C8A1F3A43C8', ambulance_dumy_name: 'BARIADA_3049', ambulance_type: 3, is_online: 0, last_active_time: '2025-10-14 17:38:53' },
  { sl_no: 152, mac_id: '3C8A1F3B3C44', ambulance_dumy_name: 'BALASORE', ambulance_type: 3, is_online: 0, last_active_time: '2025-12-06 14:40:07' },
  { sl_no: 153, mac_id: '8C4F00C4D228', ambulance_dumy_name: 'KHORDHA_6161', ambulance_type: 5, is_online: 0, last_active_time: '2025-11-22 16:37:48' },
  { sl_no: 154, mac_id: '3C8A1F3B5F20', ambulance_dumy_name: 'Sunshine_0110', ambulance_type: 4, is_online: 1, last_active_time: '2025-12-24 09:45:06' },
  { sl_no: 155, mac_id: '3C8A1F3A37A4', ambulance_dumy_name: 'Care_2686', ambulance_type: 1, is_online: 0, last_active_time: '2025-12-08 06:51:23' },
  { sl_no: 156, mac_id: '8C4F00C35F58', ambulance_dumy_name: 'Care_6910', ambulance_type: 2, is_online: 0, last_active_time: '2025-12-06 14:38:07' },
  { sl_no: 157, mac_id: '3C8A1F3B245C', ambulance_dumy_name: 'Care_5394', ambulance_type: 1, is_online: 0, last_active_time: '2025-11-26 16:52:51' },
  { sl_no: 158, mac_id: '3C8A1F3A3918', ambulance_dumy_name: 'Hi-tech_3423', ambulance_type: 5, is_online: 0, last_active_time: '2025-11-14 07:31:34' },
  { sl_no: 159, mac_id: '8C4F00C4D6B0', ambulance_dumy_name: 'Hi-tech_3032', ambulance_type: 2, is_online: 0, last_active_time: '2025-11-28 10:26:27' },
];

// Function to format MAC address (add colons)
function formatMacAddress(mac: string): string {
  // Remove any existing separators and uppercase
  const cleanMac = mac.replace(/[:-]/g, '').toUpperCase();
  // Insert colons every 2 characters
  return cleanMac.match(/.{1,2}/g)?.join(':') || cleanMac;
}

async function importDevices() {
  console.log("Starting device import...");
  
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  
  // Track seen MAC addresses to handle duplicates
  const seenMacs = new Set<string>();
  
  for (const product of productsData) {
    try {
      const macAddress = formatMacAddress(product.mac_id);
      
      // Skip duplicates
      if (seenMacs.has(macAddress)) {
        console.log(`Skipping duplicate MAC: ${macAddress}`);
        skipped++;
        continue;
      }
      seenMacs.add(macAddress);
      
      const group = ambulanceTypeMap[product.ambulance_type] || "Unknown";
      const status = product.is_online === 1 ? "online" : "offline";
      const lastSeen = product.last_active_time ? new Date(product.last_active_time) : new Date();
      
      await db.insert(devices).values({
        name: product.ambulance_dumy_name,
        macAddress: macAddress,
        group: group,
        status: status,
        lastSeen: lastSeen,
        otaStatus: "idle",
        previousVersion: "",
        currentVersion: "",
        targetVersion: "",
      }).onDuplicateKeyUpdate({
        set: {
          name: sql`VALUES(name)`,
          group: sql`VALUES(\`group\`)`,
          status: sql`VALUES(status)`,
          lastSeen: sql`VALUES(last_seen)`,
        }
      });
      
      imported++;
      console.log(`Imported: ${product.ambulance_dumy_name} (${macAddress})`);
    } catch (error) {
      console.error(`Error importing ${product.ambulance_dumy_name}:`, error);
      errors++;
    }
  }
  
  console.log(`\nImport complete:`);
  console.log(`  - Imported: ${imported}`);
  console.log(`  - Skipped (duplicates): ${skipped}`);
  console.log(`  - Errors: ${errors}`);
  
  process.exit(0);
}

importDevices();
