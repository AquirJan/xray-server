-- MySQL dump 10.13  Distrib 8.0.32, for Linux (x86_64)
--
-- Host: localhost    Database: vpndb
-- ------------------------------------------------------
-- Server version	8.0.32-0buntu0.22.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `clients`
--

DROP TABLE IF EXISTS `clients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clients` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  `email` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '用户名',
  `uuid` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '用户id',
  `port` int DEFAULT NULL COMMENT '端口',
  `off_date` datetime DEFAULT NULL COMMENT '结束时间',
  `remark` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `up` bigint DEFAULT '0' COMMENT '上行数据量',
  `down` bigint DEFAULT '0' COMMENT '下行数据量',
  `traffic` int DEFAULT '0' COMMENT '可用流量',
  `price` float DEFAULT '0' COMMENT '每月费用',
  `api` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT '/web3' COMMENT '配置文件内的api地址',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email_UNIQUE` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clients`
--

LOCK TABLES `clients` WRITE;
/*!40000 ALTER TABLE `clients` DISABLE KEYS */;
INSERT INTO `clients` VALUES (5,'temp@gmail.com','5322aea0-0e39-11ed-90c3-893b1b9391d3',1584,'2024-03-02 00:32:17','linshi','2022-11-24 00:34:11','2024-03-02 00:32:17',0,-41789837976,20,15,'/web3x'),(6,'wing.free0@gmail.com','0ef42530-dc80-11ee-98a3-c3dbf8188c3b',1188,'2024-11-25 00:32:17','admin','2022-11-24 00:39:27','2024-04-01 08:00:00',159282600,-6640952005,20,15,'/samoAdmin'),(7,'taohaiyong@gmail.com','ea3d52e0-6b95-11ed-8285-0131565a2123',1306,'2026-01-02 04:15:14','tao网友','2022-11-24 01:20:53','2024-03-23 01:00:00',9909529,-485764643598,30,25,'/requestRainf'),(8,'zk@gmail.com','d5e4c700-6b96-11ed-8285-0131565a2123',1112,'2023-12-24 00:35:00','隆仔','2022-11-24 01:26:21','2024-03-24 00:35:00',0,-40395045538,5,10,'/zkPubs'),(9,'rice@gmail.com','c80ef2d0-6b97-11ed-8285-0131565a2123',1795,'2024-08-01 09:14:00','饭姐','2022-11-24 01:33:15','2024-04-01 04:00:00',96872139,-240133154,15,10,'/riceUploade'),(10,'zhijian@gmail.com','7c735e50-6b98-11ed-8285-0131565a2123',13237,'2023-03-05 01:17:14','陈智健','2022-11-24 01:39:43','2023-03-06 06:49:38',0,-17476512011,5,10,'/beAuth'),(11,'disheng@gmail.com','4d64ada0-6b9b-11ed-9b17-d7939cf5398c',1211,'2024-08-11 10:18:55','迪生','2022-11-24 02:00:47','2024-03-11 10:18:55',0,-60081544927,5,10,'/wenxua'),(12,'xianheng@gmail.com','0c164650-6b9c-11ed-9b17-d7939cf5398c',1977,'2024-07-18 13:09:55','贤恒','2022-11-24 02:02:43','2024-03-18 13:09:55',0,-12871293895,3,5,'/xianheng'),(13,'weiwei@gmail.com','2cb24640-a042-11ed-836f-4d02169814fa',1998,'2023-09-03 02:02:08','薇薇','2023-01-30 02:03:44','2023-09-03 02:02:08',0,-25075750237,3,5,'/weiweiYes'),(14,'duweiwei26@outlook.com','3355ad40-b1c5-11ed-a2ec-3b407429d03f',1782,'2023-10-07 08:52:16','du薇薇','2023-02-21 09:00:03','2023-10-07 08:52:16',0,-28962161561,3,5,'/duww'),(15,'sensong@gmail.com','700c7f80-f89b-11ed-869b-8593c2276cc8',1756,'2023-06-23 12:22:34','森松','2023-05-22 12:23:30','2023-08-23 12:22:34',0,-12821748592,3,5,'/sensen'),(16,'heyonghua@gmail.com','3742b610-0660-11ee-8f1b-258ed18426d5',1689,'2023-05-10 00:51:17','何永华','2023-06-09 00:54:50','2023-08-10 00:51:17',0,-9527886594,3,5,'/gethuxiu');
/*!40000 ALTER TABLE `clients` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  `name` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '用户名',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `passwd` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL COMMENT '密码',
  `last_time` datetime DEFAULT NULL COMMENT '上次登录时间',
  `off_time` datetime DEFAULT NULL COMMENT '截止时间',
  `remark` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2024-04-01  8:00:00
