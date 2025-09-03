const { setGlobalOptions } = require("firebase-functions/v2");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const logger = require("firebase-functions/logger");

initializeApp();

setGlobalOptions({ maxInstances: 10 });

exports.checkDailyStreaks = onSchedule(
  {
    schedule: "0 0 * * *",
    timeZone: "Europe/Skopje",
  },
  async (event) => {
    const db = getFirestore();

    try {
      const groupsSnapshot = await db.collection("groups").get();

      if (groupsSnapshot.empty) {
        logger.info("No groups found");
        return;
      }

      let processedGroups = 0;
      let streaksReset = 0;
      let streaksMaintained = 0;

      const batch = db.batch();

      for (const groupDoc of groupsSnapshot.docs) {
        const groupData = groupDoc.data();
        const groupId = groupDoc.id;
        const groupRef = db.collection("groups").doc(groupId);

        logger.info(`Checking group "${groupData.name}" (${groupId})`);
        logger.info(
          `Current streak: ${groupData.currentStreak || 0}, todayStreak: ${
            groupData.todayStreak
          }`
        );

        if (groupData.todayStreak === true) {
          batch.update(groupRef, {
            todayStreak: false,
          });

          streaksMaintained++;
          logger.info(
            `Group "${groupData.name}": Streak maintained at ${groupData.currentStreak} days`
          );
        } else {
          batch.update(groupRef, {
            currentStreak: 0,
            todayStreak: false,
          });

          streaksReset++;
          logger.info(`Group "${groupData.name}": Streak reset to 0`);
        }

        processedGroups++;
      }

      await batch.commit();

      logger.info(`Streaks maintained: ${streaksMaintained}`);
      logger.info(`Streaks reset: ${streaksReset}`);

      return {
        success: true,
        processedGroups,
        streaksMaintained,
        streaksReset,
      };
    } catch (error) {
      logger.error("Error in daily streak check:", error);
      throw error;
    }
  }
);
