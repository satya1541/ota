import mysql from "mysql2/promise";

// Map ambulance_type to group names
const typeToGroup: Record<number, string> = {
  1: "ALS",
  2: "BLS_LARGE",
  3: "BLS_MINI",
  4: "BLS_MICRO",
  5: "HEARSE_VAN",
};

async function importDevices() {
  const conn = await mysql.createConnection({
    host: "15.206.156.197",
    port: 3306,
    user: "satya",
    password: "satya123",
    database: "ota_db",
  });

  console.log("Connected to database");

  // Products data from backup (extracted)
  const products = [
    { mac_id: '3C8A1F3A0090', name: 'KHUM_7415', type: 4, lat: 20.188071, lng: 85.607105, is_online: 0, last_active: '2025-11-17 20:36:30' },
    { mac_id: '3C8A1F3A8CA8', name: 'KHUM_4707', type: 4, lat: 20.188029, lng: 85.60729, is_online: 0, last_active: '2025-11-19 08:50:26' },
    { mac_id: '3C8A1F3AAC34', name: 'KHUM_6428', type: 4, lat: 20.188054, lng: 85.607146, is_online: 0, last_active: '2025-09-29 18:22:55' },
    { mac_id: '3C8A1F3A8DA0', name: 'KHUM_2851', type: 4, lat: 20.187928, lng: 85.607097, is_online: 0, last_active: '2025-12-05 15:16:56' },
    { mac_id: '3C8A1F3A6378', name: 'KHUM_3562', type: 4, lat: 20.187908, lng: 85.607127, is_online: 0, last_active: '2025-11-20 10:32:29' },
    { mac_id: '3C8A1F39D43C', name: 'KHUM_4723', type: 4, lat: 20.188004, lng: 85.607211, is_online: 0, last_active: '2025-12-06 11:51:22' },
    { mac_id: '3C8A1F39DAF4', name: 'KHUM_2315', type: 4, lat: 20.283681, lng: 85.768523, is_online: 0, last_active: '2025-12-03 17:48:40' },
    { mac_id: '3C8A1F3BC294', name: 'KHUM_2420', type: 4, lat: 20.18804, lng: 85.607217, is_online: 0, last_active: '2025-09-26 17:56:34' },
    { mac_id: '3C8A1F39DB5C', name: 'VIVEK_9063', type: 4, lat: 20.208698, lng: 85.341917, is_online: 0, last_active: '2025-09-02 05:52:19' },
    { mac_id: '3C8A1F3A0A68', name: 'VIVEK_2544', type: 4, lat: 20.287588, lng: 85.790721, is_online: 0, last_active: '2025-11-17 16:50:41' },
    { mac_id: '3C8A1F3B918C', name: 'VIVEK_0183', type: 4, lat: 20.287535, lng: 85.79072, is_online: 0, last_active: '2025-12-08 06:51:15' },
    { mac_id: '3C8A1F3A9D34', name: 'MANIPAL_7119', type: 4, lat: 20.259782, lng: 85.778039, is_online: 0, last_active: '2025-09-02 18:28:29' },
    { mac_id: '3C8A1F3A6AF4', name: 'MANIPAL_1098', type: 4, lat: 20.2598, lng: 85.777159, is_online: 0, last_active: '2025-09-22 04:57:30' },
    { mac_id: '3C8A1F3B9788', name: 'AIIMS_1418', type: 4, lat: 20.23045, lng: 85.775347, is_online: 0, last_active: '2025-08-19 01:25:49' },
    { mac_id: '3C8A1F3A6380', name: 'AIIMS_6286', type: 4, lat: 20.255995, lng: 85.866388, is_online: 0, last_active: '2025-09-11 14:53:23' },
    { mac_id: '3C8A1F3A8A70', name: 'AIIMS_3479', type: 4, lat: 20.230252, lng: 85.774978, is_online: 0, last_active: '2025-09-23 18:43:35' },
    { mac_id: '3C8A1F3B25E0', name: 'AIIMS_3713', type: 4, lat: 20.230692, lng: 85.775091, is_online: 0, last_active: '2025-11-21 08:35:15' },
    { mac_id: '3C8A1F3AB658', name: 'AIIMS_9967', type: 4, lat: 20.230354, lng: 85.775077, is_online: 0, last_active: '2025-07-24 19:55:28' },
    { mac_id: '3C8A1F3B309C', name: 'INDE_3715', type: 4, lat: 20.294521, lng: 85.838519, is_online: 0, last_active: '2025-11-04 13:17:27' },
    { mac_id: '3C8A1F3A0F5C', name: 'INDE_1893', type: 3, lat: 20.2946, lng: 85.838492, is_online: 0, last_active: '2025-11-23 21:44:56' },
    { mac_id: '3C8A1F3A7D48', name: 'INDE_0012', type: 3, lat: 20.318991, lng: 85.815045, is_online: 0, last_active: '2025-11-08 11:13:15' },
    { mac_id: '3C8A1F3BA8B0', name: 'INDE_3812', type: 3, lat: 20.092532, lng: 85.918108, is_online: 0, last_active: '2025-09-26 16:04:48' },
    { mac_id: '3C8A1F3A52FC', name: 'VIVEKA_1444', type: 4, lat: 20.278901, lng: 85.800145, is_online: 0, last_active: '2025-12-08 06:49:20' },
    { mac_id: '3C8A1F3B53C8', name: 'KIDS_6267', type: 3, lat: 20.244906, lng: 85.784617, is_online: 0, last_active: '2025-11-30 15:12:11' },
    { mac_id: '3C8A1F3ACA28', name: 'AIIMS_3753', type: 4, lat: 20.229927, lng: 85.774853, is_online: 0, last_active: '2025-08-01 12:57:13' },
    { mac_id: '3C8A1F39FC74', name: 'AIIMS_9020', type: 4, lat: 20.230159, lng: 85.777924, is_online: 0, last_active: '2025-07-16 17:32:22' },
    { mac_id: '3C8A1F3AB518', name: 'AIIMS_3793', type: 4, lat: 20.25597, lng: 85.866478, is_online: 0, last_active: '2025-12-24 06:02:40' },
    { mac_id: '3C8A1F3A301C', name: 'AIIMS_4202', type: 3, lat: 20.230208, lng: 85.777925, is_online: 0, last_active: '2025-09-04 16:58:17' },
    { mac_id: '3C8A1F3A4EB4', name: 'INDE_5442', type: 4, lat: 20.304968, lng: 85.77682, is_online: 0, last_active: '2025-11-24 17:47:49' },
    { mac_id: '3C8A1F3A34CC', name: 'KIIMS_4515', type: 3, lat: 20.350988, lng: 85.811832, is_online: 0, last_active: '2025-11-20 09:12:20' },
    { mac_id: '3C8A1F3B4AAC', name: 'HITECH_8109', type: 4, lat: 20.324718, lng: 86.358478, is_online: 0, last_active: '2025-11-19 05:47:00' },
    { mac_id: '3C8A1F3A31EC', name: 'INDE_4761', type: 4, lat: 20.301349, lng: 85.87685, is_online: 0, last_active: '2025-11-28 18:04:23' },
    { mac_id: '3C8A1F3B2CD0', name: 'CARE_7542', type: 1, lat: 20.321577, lng: 85.818144, is_online: 0, last_active: '2025-12-08 06:51:23' },
    { mac_id: '3C8A1F3A3D68', name: 'CARE_6155', type: 4, lat: 20.387192, lng: 85.886454, is_online: 0, last_active: '2025-11-07 05:37:50' },
    { mac_id: '3C8A1F39CF3C', name: 'CARE_4878', type: 4, lat: 20.314658, lng: 85.819325, is_online: 0, last_active: '2025-11-14 00:08:11' },
    { mac_id: '3C8A1F3A6BC8', name: 'ASHWINI_8366', type: 4, lat: 20.47411, lng: 85.849082, is_online: 0, last_active: '2025-09-04 12:29:15' },
    { mac_id: '3C8A1F3B778C', name: 'ASHWINI1218', type: 4, lat: 20.676716, lng: 83.462299, is_online: 0, last_active: '2025-11-02 01:21:24' },
    { mac_id: '3C8A1F3B6FB0', name: 'ASHWINI8343', type: 4, lat: 20.473971, lng: 85.848936, is_online: 0, last_active: '2025-07-20 04:38:16' },
    { mac_id: '3C8A1F3B3CF0', name: 'ASHWINI_5167', type: 3, lat: 20.472342, lng: 85.847566, is_online: 0, last_active: '2025-11-02 02:37:20' },
    { mac_id: '3C8A1F3B290C', name: 'ASHWINI_3396', type: 3, lat: 20.472326, lng: 85.847549, is_online: 0, last_active: '2025-09-05 14:50:47' },
    { mac_id: '3C8A1F3B6A30', name: 'SCB_5284', type: 4, lat: 20.471545, lng: 85.892803, is_online: 0, last_active: '2025-08-30 21:02:32' },
    { mac_id: '3C8A1F3B9328', name: 'SCB_4286', type: 4, lat: 20.47135, lng: 85.893113, is_online: 0, last_active: '2025-08-16 06:57:51' },
    { mac_id: '3C8A1F3B5638', name: 'SCB_4831', type: 1, lat: 20.471539, lng: 85.892749, is_online: 0, last_active: '2025-08-30 10:41:26' },
    { mac_id: '3C8A1F3AF79C', name: 'SCB_2129', type: 3, lat: 20.471462, lng: 85.893021, is_online: 0, last_active: '2025-11-20 15:18:33' },
    { mac_id: '3C8A1F3B437C', name: 'SCB_2707', type: 3, lat: 20.471273, lng: 85.892642, is_online: 0, last_active: '2025-09-01 14:00:19' },
    { mac_id: '3C8A1F3B3734', name: 'SCB_1953', type: 4, lat: 20.471267, lng: 85.893215, is_online: 0, last_active: '2025-08-23 06:02:46' },
    { mac_id: '3C8A1F3A7444', name: 'KIIMS_0471', type: 4, lat: 20.255706, lng: 85.840241, is_online: 0, last_active: '2025-11-27 14:21:09' },
    { mac_id: '3C8A1F3A6C58', name: 'INDE_6820', type: 4, lat: 20.259127, lng: 85.828523, is_online: 0, last_active: '2025-09-25 19:43:56' },
    { mac_id: '3C8A1F3A3818', name: 'INDE_8032', type: 4, lat: 20.322063, lng: 85.813546, is_online: 0, last_active: '2025-09-18 06:28:40' },
    { mac_id: '3C8A1F3B5C14', name: 'KIMS_3676', type: 4, lat: 20.717655, lng: 86.136185, is_online: 0, last_active: '2025-10-29 05:33:37' },
    { mac_id: '3C8A1F3A5D78', name: 'CARE_6212', type: 3, lat: 21.206327, lng: 86.648449, is_online: 0, last_active: '2025-11-26 10:13:09' },
    { mac_id: '3C8A1F3B4578', name: 'INDE_2776', type: 4, lat: 0, lng: 0, is_online: 0, last_active: '2025-08-07 11:58:13' },
    { mac_id: '3C8A1F3B697C', name: 'SUNSHINE_9029', type: 1, lat: 20.268953, lng: 85.848615, is_online: 0, last_active: '2025-12-08 06:51:23' },
    { mac_id: '3C8A1F3B3108', name: 'SUNSHINE_3875', type: 4, lat: 20.272799, lng: 85.851538, is_online: 0, last_active: '2025-12-02 06:59:38' },
    { mac_id: '3C8A1F3B68E8', name: 'SUM_2095', type: 4, lat: 20.284324, lng: 85.769989, is_online: 0, last_active: '2025-11-22 08:30:03' },
    { mac_id: '3C8A1F3B3B1C', name: 'CAPITAL_9808', type: 3, lat: 20.261581, lng: 85.82043, is_online: 0, last_active: '2025-12-08 06:51:32' },
    { mac_id: '3C8A1F3A5FAC', name: 'SCB_0585', type: 4, lat: 20.804982, lng: 86.237823, is_online: 0, last_active: '2025-09-01 10:44:04' },
    { mac_id: '3C8A1F3A6D50', name: 'SCB_3143', type: 4, lat: 20.476821, lng: 85.888078, is_online: 0, last_active: '2025-09-16 05:22:28' },
    { mac_id: '3C8A1F3A6730', name: 'ASHWINI_0212', type: 3, lat: 20.635918, lng: 86.091753, is_online: 0, last_active: '2025-10-30 11:28:42' },
    { mac_id: '3C8A1F3AC26C', name: 'INDE_5668', type: 1, lat: 20.301999, lng: 85.875892, is_online: 0, last_active: '2025-11-28 09:56:39' },
    { mac_id: '3C8A1F3A71A4', name: 'KHU_6854', type: 4, lat: 20.188072, lng: 85.607126, is_online: 0, last_active: '2025-12-04 01:20:34' },
    { mac_id: '3C8A1F3B2AF0', name: 'AIIMS_3818', type: 4, lat: 20.230479, lng: 85.775011, is_online: 0, last_active: '2025-11-05 06:42:47' },
    { mac_id: '3C8A1F3B2368', name: 'SUM_2618', type: 4, lat: 20.284307, lng: 85.769973, is_online: 0, last_active: '2025-11-09 23:17:56' },
    { mac_id: '3C8A1F3A71D8', name: 'SUM_5042', type: 4, lat: 20.269349, lng: 85.765116, is_online: 0, last_active: '2025-11-10 07:49:29' },
    { mac_id: '3C8A1F3B5530', name: 'SUM_6694', type: 4, lat: 20.284323, lng: 85.770055, is_online: 0, last_active: '2025-11-06 09:20:02' },
    { mac_id: '3C8A1F3B71E0', name: 'SUM_0477', type: 3, lat: 20.634583, lng: 85.252439, is_online: 0, last_active: '2025-10-19 09:30:28' },
    { mac_id: '8C4F00C4B650', name: 'SUM_9288', type: 4, lat: 21.415969, lng: 86.78912, is_online: 0, last_active: '2025-11-05 17:02:55' },
    { mac_id: '3C8A1F3B2C70', name: 'MEDX_9470', type: 4, lat: 20.362126, lng: 85.889623, is_online: 0, last_active: '2025-12-06 13:37:39' },
    { mac_id: '3C8A1F3B2B98', name: 'INDE_9877', type: 3, lat: 22.266222, lng: 86.171767, is_online: 0, last_active: '2025-11-27 13:19:59' },
    { mac_id: '3C8A1F3B5D6C', name: 'SCB_7136', type: 4, lat: 20.470946, lng: 85.893419, is_online: 0, last_active: '2025-09-04 10:22:11' },
    { mac_id: '3C8A1F3B2898', name: 'SCB_2213', type: 4, lat: 20.430647, lng: 85.87455, is_online: 0, last_active: '2025-11-27 05:47:55' },
    { mac_id: '3C8A1F3A6698', name: 'ACB_6832', type: 3, lat: 20.947488, lng: 86.178828, is_online: 0, last_active: '2025-09-23 13:10:41' },
    { mac_id: '3C8A1F3B5DEC', name: 'SCB_9642', type: 4, lat: 20.46593, lng: 85.884864, is_online: 0, last_active: '2025-09-12 09:42:41' },
    { mac_id: '3C8A1F3B6784', name: 'SCB_3800', type: 4, lat: 20.473159, lng: 85.893358, is_online: 0, last_active: '2025-09-11 05:55:29' },
    { mac_id: '3C8A1F3B4344', name: 'SCB_4167', type: 3, lat: 25.386917, lng: 85.060077, is_online: 0, last_active: '2025-09-12 17:39:42' },
    { mac_id: '3C8A1F3B6F74', name: 'SCB_3364', type: 1, lat: 20.259309, lng: 86.654287, is_online: 0, last_active: '2025-10-03 03:56:39' },
    { mac_id: '3C8A1F3A7894', name: 'SCB_3513', type: 1, lat: 20.472873, lng: 85.894677, is_online: 0, last_active: '2025-09-01 21:55:42' },
    { mac_id: '3C8A1F3A75D0', name: 'SCB_8855', type: 1, lat: 20.47253, lng: 85.893924, is_online: 0, last_active: '2025-08-07 21:48:04' },
    { mac_id: '3C8A1F3B6AD4', name: 'SCB_0636', type: 4, lat: 20.250788, lng: 85.829724, is_online: 0, last_active: '2025-10-02 05:17:25' },
    { mac_id: '3C8A1F3A500C', name: 'SCB_9527', type: 4, lat: 20.470668, lng: 85.893143, is_online: 0, last_active: '2025-08-15 17:48:31' },
    { mac_id: '3C8A1F3B2A30', name: 'SCB_0400', type: 4, lat: 20.468811, lng: 85.782815, is_online: 0, last_active: '2025-12-05 07:46:48' },
    { mac_id: '3C8A1F3B2A74', name: 'SCB_246', type: 4, lat: 20.473025, lng: 85.894847, is_online: 0, last_active: '2025-08-17 08:13:05' },
    { mac_id: '3C8A1F3B5518', name: 'SCB_6458', type: 4, lat: 20.347396, lng: 85.885664, is_online: 0, last_active: '2025-09-24 09:00:05' },
    { mac_id: '3C8A1F3B7220', name: 'SCB_9545', type: 4, lat: 20.470803, lng: 85.893223, is_online: 0, last_active: '2025-09-02 17:16:39' },
    { mac_id: '3C8A1F3A5798', name: 'SCB_5610', type: 4, lat: 19.793392, lng: 85.817453, is_online: 0, last_active: '2025-11-03 18:28:30' },
    { mac_id: '3C8A1F3B57C4', name: 'AIMS_2212', type: 4, lat: 20.3203, lng: 85.724035, is_online: 0, last_active: '2025-09-11 18:59:28' },
    { mac_id: '3C8A1F3A63D8', name: 'IGKC_3245', type: 3, lat: 20.286573, lng: 85.77444, is_online: 0, last_active: '2025-11-29 15:00:27' },
    { mac_id: '3C8A1F3B75A4', name: 'SUM_0864', type: 4, lat: 20.284272, lng: 85.769947, is_online: 0, last_active: '2025-11-05 07:25:52' },
    { mac_id: '3C8A1F3A55D0', name: 'CAPITAL_9399', type: 3, lat: 20.262556, lng: 85.822839, is_online: 0, last_active: '2025-11-12 18:25:25' },
    { mac_id: '3C8A1F3B2354', name: 'CAPITAL_2010', type: 3, lat: 20.262552, lng: 85.822795, is_online: 0, last_active: '2025-11-12 16:12:11' },
    { mac_id: '3C8A1F3B27C0', name: 'SUM_7378', type: 3, lat: 20.284255, lng: 85.769986, is_online: 0, last_active: '2025-08-21 13:17:12' },
    { mac_id: '3C8A1F3B5274', name: 'SCB_6522', type: 4, lat: 20.471784, lng: 85.89305, is_online: 0, last_active: '2025-11-09 19:14:01' },
    { mac_id: '3C8A1F3B6F98', name: 'BBSR_9906', type: 4, lat: 20.262196, lng: 85.820853, is_online: 0, last_active: '2025-11-13 12:10:33' },
    { mac_id: '8C4F00C4D20C', name: 'BBSR_8459', type: 3, lat: 20.261759, lng: 85.82045, is_online: 0, last_active: '2025-11-13 11:14:42' },
    { mac_id: '3C8A1F3B9264', name: 'BBSR_3554', type: 3, lat: 20.301374, lng: 85.876159, is_online: 0, last_active: '2025-08-27 17:19:52' },
    { mac_id: '3C8A1F3B5524', name: 'CUTTACK_0193', type: 4, lat: 20.471538, lng: 85.892764, is_online: 0, last_active: '2025-08-21 18:50:35' },
    { mac_id: '3C8A1F3B26AC', name: 'CUTTACK_2493', type: 4, lat: 20.471334, lng: 85.893269, is_online: 0, last_active: '2025-11-29 12:20:51' },
    { mac_id: '3C8A1F3A6550', name: 'CUTTACK_7124', type: 4, lat: 20.472071, lng: 85.893358, is_online: 0, last_active: '2025-08-24 06:06:19' },
    { mac_id: '3C8A1F3A5DFC', name: 'SCB_0410', type: 4, lat: 20.472068, lng: 85.893445, is_online: 0, last_active: '2025-09-02 07:36:11' },
    { mac_id: '3C8A1F3B1FB4', name: 'JAGATSINGHPUR_3418', type: 4, lat: 20.252385, lng: 86.179342, is_online: 0, last_active: '2025-10-10 03:58:44' },
    { mac_id: '3C8A1F3B5E20', name: 'JAGATSINGHPUR_5432', type: 3, lat: 20.22866, lng: 86.173013, is_online: 0, last_active: '2025-09-03 16:28:21' },
    { mac_id: '3C8A1F3B2D84', name: 'JAGATSINGHPUR_7806', type: 4, lat: 20.409157, lng: 86.013516, is_online: 0, last_active: '2025-10-21 13:25:09' },
    { mac_id: '3C8A1F3A46B0', name: 'JAGATSINGHPUR_1962', type: 4, lat: 20.251335, lng: 86.180681, is_online: 0, last_active: '2025-12-01 03:09:57' },
    { mac_id: '3C8A1F3B2230', name: 'JAGATSINGHPUR_3184', type: 3, lat: 20.089029, lng: 86.09809, is_online: 0, last_active: '2025-09-07 22:34:32' },
    { mac_id: '3C8A1F3B5054', name: 'JAGATSINGHPUR_0345', type: 3, lat: 20.227155, lng: 86.532002, is_online: 0, last_active: '2025-09-30 16:46:39' },
    { mac_id: '3C8A1F3B203C', name: 'JAGATSINGHPUR_3955', type: 3, lat: 20.251408, lng: 86.180953, is_online: 0, last_active: '2025-12-06 14:40:07' },
    { mac_id: '3C8A1F3B5924', name: 'SUM_1931', type: 4, lat: 20.284206, lng: 85.769856, is_online: 0, last_active: '2025-11-13 21:34:38' },
    { mac_id: '3C8A1F3A42A0', name: 'SCB_6971', type: 4, lat: 20.465683, lng: 85.893251, is_online: 0, last_active: '2025-09-07 05:32:58' },
    { mac_id: '3C8A1F3A36C8', name: 'SCB_2831', type: 4, lat: 20.471491, lng: 85.893812, is_online: 0, last_active: '2025-09-06 05:54:08' },
    { mac_id: '3C8A1F3A9BAC', name: 'SCB_3019', type: 4, lat: 20.561324, lng: 86.002394, is_online: 0, last_active: '2025-09-04 19:35:43' },
    { mac_id: '3C8A1F3B3838', name: 'SCB_3019', type: 4, lat: 22.204969, lng: 86.890201, is_online: 0, last_active: '2025-09-04 20:26:16' },
    { mac_id: '3C8A1F3B1ECC', name: 'SCB_4937', type: 4, lat: 20.452178, lng: 85.899619, is_online: 0, last_active: '2025-11-26 21:43:14' },
    { mac_id: '3C8A1F3B5DFC', name: 'SCB_6974', type: 4, lat: 20.471354, lng: 85.893144, is_online: 0, last_active: '2025-09-04 22:43:59' },
    { mac_id: '3C8A1F3B45F4', name: 'HITECH_1196', type: 4, lat: 20.694412, lng: 85.56977, is_online: 0, last_active: '2025-11-04 14:50:50' },
    { mac_id: '3C8A1F3A788C', name: 'HITECH_1188', type: 4, lat: 20.302312, lng: 85.875715, is_online: 0, last_active: '2025-09-12 10:28:37' },
    { mac_id: '3C8A1F3B1F48', name: 'HITECH_5060', type: 4, lat: 20.302224, lng: 85.875699, is_online: 0, last_active: '2025-09-22 02:54:26' },
    { mac_id: '3C8A1F3A76D8', name: 'HITECH_3945', type: 4, lat: 20.302236, lng: 85.875678, is_online: 0, last_active: '2025-09-28 04:21:51' },
    { mac_id: '3C8A1F39DF68', name: 'HITECH_9711', type: 4, lat: 20.320645, lng: 85.87976, is_online: 0, last_active: '2025-10-01 05:35:19' },
    { mac_id: '3C8A1F39FBC4', name: 'HITECH_3005', type: 4, lat: 20.302163, lng: 85.875695, is_online: 0, last_active: '2025-09-26 07:17:21' },
    { mac_id: '3C8A1F3B3EB0', name: 'HITECH_1596', type: 4, lat: 20.05419, lng: 86.006774, is_online: 0, last_active: '2025-10-03 13:15:11' },
    { mac_id: '3C8A1F3A649C', name: 'PURIGOV_7666', type: 3, lat: 19.961853, lng: 85.825512, is_online: 0, last_active: '2025-11-09 08:15:24' },
    { mac_id: '3C8A1F3A9128', name: 'PURIGOV_6353', type: 3, lat: 20.048293, lng: 85.827848, is_online: 0, last_active: '2025-12-04 16:43:04' },
    { mac_id: '3C8A1F39DDC8', name: 'PURIGOV_0989', type: 4, lat: 19.813196, lng: 85.830313, is_online: 0, last_active: '2025-11-09 00:26:46' },
    { mac_id: '3C8A1F3B2B78', name: 'AIIMS_2212', type: 3, lat: 20.460099, lng: 85.850783, is_online: 0, last_active: '2025-09-11 19:12:59' },
    { mac_id: '3C8A1F3A40E8', name: 'AIIMS_2212', type: 4, lat: 19.919846, lng: 85.818319, is_online: 0, last_active: '2025-09-11 12:06:21' },
    { mac_id: '3C8A1F3A4BB4', name: 'REMU_3096', type: 3, lat: 21.301351, lng: 86.701077, is_online: 0, last_active: '2025-09-21 03:11:46' },
    { mac_id: '3C8A1F3BA9DC', name: 'REMU_5035', type: 3, lat: 21.494707, lng: 86.935228, is_online: 0, last_active: '2025-10-30 06:40:48' },
    { mac_id: '3C8A1F3B6F38', name: 'REMU_1919', type: 3, lat: 21.790372, lng: 87.286596, is_online: 0, last_active: '2025-12-08 06:32:04' },
    { mac_id: '3C8A1F3B4AF8', name: 'REMU_0925', type: 3, lat: 21.520027, lng: 86.882605, is_online: 0, last_active: '2025-12-06 03:47:50' },
    { mac_id: '3C8A1F3A7720', name: 'SCB_4505', type: 4, lat: 20.486821, lng: 86.009416, is_online: 0, last_active: '2025-10-16 01:37:14' },
    { mac_id: '3C8A1F3A55D8', name: 'ASHWINI_2413', type: 4, lat: 20.443616, lng: 85.833207, is_online: 0, last_active: '2025-10-17 18:11:36' },
    { mac_id: '3C8A1F3A5694', name: 'HITECH_9419', type: 4, lat: 20.302363, lng: 85.875708, is_online: 0, last_active: '2025-09-27 23:06:45' },
    { mac_id: '8C4F00C3EDDC', name: 'HITECH_7619', type: 3, lat: 20.302233, lng: 85.875619, is_online: 0, last_active: '2025-09-20 07:39:46' },
    { mac_id: '3C8A1F3B3A48', name: 'Khorda_Govt', type: 3, lat: 20.188109, lng: 85.607261, is_online: 0, last_active: '2025-11-21 02:31:17' },
    { mac_id: '3C8A1F3A714C', name: 'Khurda_1917', type: 4, lat: 20.188184, lng: 85.607241, is_online: 0, last_active: '2025-11-29 06:32:27' },
    { mac_id: '3C8A1F3B45C8', name: 'SUNSHINE_5738', type: 3, lat: 20.280869, lng: 85.855463, is_online: 0, last_active: '2025-09-28 08:28:33' },
    { mac_id: '3C8A1F3B28C4', name: 'SCB_0840', type: 4, lat: 20.47131, lng: 85.893188, is_online: 0, last_active: '2025-11-28 01:59:43' },
    { mac_id: '3C8A1F3A3414', name: 'SCB_0108', type: 3, lat: 20.471639, lng: 85.893889, is_online: 0, last_active: '2025-09-29 19:39:00' },
    { mac_id: '3C8A1F3B5548', name: 'INDE_8247', type: 4, lat: 20.294526, lng: 85.838369, is_online: 0, last_active: '2025-12-01 23:32:45' },
    { mac_id: '3C8A1F3B34B4', name: 'SCB_4008', type: 4, lat: 20.470626, lng: 85.893121, is_online: 0, last_active: '2025-09-30 16:13:39' },
    { mac_id: '3C8A1F39DB04', name: 'SCB_0436', type: 4, lat: 21.339338, lng: 86.757667, is_online: 0, last_active: '2025-10-06 15:03:17' },
    { mac_id: '3C8A1F3A43C8', name: 'BARIADA_3049', type: 3, lat: 21.930628, lng: 86.726903, is_online: 0, last_active: '2025-10-14 17:38:53' },
    { mac_id: '3C8A1F3B3C44', name: 'BALASORE', type: 3, lat: 20.302654, lng: 85.875529, is_online: 0, last_active: '2025-12-06 14:40:07' },
    { mac_id: '8C4F00C4D228', name: 'KHORDHA_6161', type: 5, lat: 20.149957, lng: 85.733702, is_online: 0, last_active: '2025-11-22 16:37:48' },
    { mac_id: '3C8A1F3B5F20', name: 'Sunshine_0110', type: 4, lat: 20.268841, lng: 85.849006, is_online: 1, last_active: '2025-12-24 09:45:06' },
    { mac_id: '3C8A1F3A37A4', name: 'Care_2686', type: 1, lat: 20.3326, lng: 85.825381, is_online: 0, last_active: '2025-12-08 06:51:23' },
    { mac_id: '8C4F00C35F58', name: 'Care_6910', type: 2, lat: 20.407994, lng: 85.832829, is_online: 0, last_active: '2025-12-06 14:38:07' },
    { mac_id: '3C8A1F3B245C', name: 'Care_5394', type: 1, lat: 20.333273, lng: 85.825782, is_online: 0, last_active: '2025-11-26 16:52:51' },
    { mac_id: '3C8A1F3A3918', name: 'Hi-tech_3423', type: 5, lat: 20.302004, lng: 85.875797, is_online: 0, last_active: '2025-11-14 07:31:34' },
    { mac_id: '8C4F00C4D6B0', name: 'Hi-tech_3032', type: 2, lat: 0, lng: 0, is_online: 0, last_active: '2025-11-28 10:26:27' },
  ];

  console.log(`Importing ${products.length} devices...`);

  let successCount = 0;
  let errorCount = 0;
  const seenMacs = new Set<string>();

  for (const p of products) {
    // Skip duplicates
    if (seenMacs.has(p.mac_id)) {
      console.log(`Skipping duplicate MAC: ${p.mac_id}`);
      continue;
    }
    seenMacs.add(p.mac_id);

    const groupName = typeToGroup[p.type] || "UNKNOWN";
    const status = p.is_online ? "online" : "offline";
    const lat = p.lat && p.lat !== 0 ? p.lat.toString() : null;
    const lng = p.lng && p.lng !== 0 ? p.lng.toString() : null;

    try {
      await conn.query(
        `INSERT INTO devices (id, name, mac_address, \`group\`, status, latitude, longitude, last_seen, ota_status, current_version, created_at, updated_at) 
         VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, 'idle', '1.0.0', NOW(), NOW())
         ON DUPLICATE KEY UPDATE 
           name = VALUES(name),
           \`group\` = VALUES(\`group\`),
           latitude = VALUES(latitude),
           longitude = VALUES(longitude),
           last_seen = VALUES(last_seen)`,
        [p.name, p.mac_id, groupName, status, lat, lng, p.last_active]
      );
      successCount++;
    } catch (err: any) {
      console.error(`Error inserting ${p.mac_id}: ${err.message}`);
      errorCount++;
    }
  }

  console.log(`\nImport complete!`);
  console.log(`Success: ${successCount}`);
  console.log(`Errors: ${errorCount}`);

  // Verify count
  const [rows] = await conn.query("SELECT COUNT(*) as count FROM devices");
  console.log(`Total devices in database: ${(rows as any)[0].count}`);

  await conn.end();
}

importDevices().catch(console.error);
