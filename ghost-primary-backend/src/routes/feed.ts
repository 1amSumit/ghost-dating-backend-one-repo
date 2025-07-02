import { Router } from "express";
import { authMiddleware } from "../utils/middleware";
import { PrismaClient } from "../../prisma/app/generated/prisma/client";
import { redisClient } from "../utils/redisClient";

const router = Router();
const prismaClient = new PrismaClient();

router.use(authMiddleware);

router.get("/getUnMatchedFeed/:page", async (req, res) => {
  //@ts-ignore
  const loggedInUser = req.userId;
  const page = req.params.page ? parseInt(req.params.page as string) : 1;
  const usersPerPage = 10;

  try {
    const [user, likedUsers, alreadyMatched, seenUsers] = await Promise.all([
      prismaClient.user.findFirst({
        where: { id: loggedInUser },
        include: { user_details: true },
      }),
      prismaClient.liked.findMany({
        where: {
          OR: [{ liked_to_id: loggedInUser }, { liked_by_id: loggedInUser }],
        },
        select: {
          liked_by: {
            select: { id: true },
          },
          liked_to: {
            select: { id: true },
          },
        },
      }),
      prismaClient.matches.findMany({
        where: {
          OR: [{ user1_id: loggedInUser }, { user2_id: loggedInUser }],
        },
        include: {
          user1: { include: { user_details: true } },
          user2: { include: { user_details: true } },
        },
      }),
      redisClient.sMembers(`seen:${loggedInUser}`),
    ]);

    const matchedUserFilter = alreadyMatched.map((match) =>
      match.user1_id === loggedInUser ? match.user2.id : match.user1.id
    );

    const likedUserIds = likedUsers.map((entry) => {
      return entry.liked_by.id === loggedInUser
        ? entry.liked_to.id
        : entry.liked_by.id;
    });
    const interestsInGender = user?.user_details?.interested_in_gender;

    const excludeUserIds = new Set([
      loggedInUser,
      ...seenUsers,
      ...matchedUserFilter,
      ...likedUserIds,
    ]);

    const getAllUser = await prismaClient.user.findMany({
      where: {
        id: {
          notIn: Array.from(excludeUserIds),
        },
        user_details: {
          is: {
            gender: interestsInGender?.toLocaleLowerCase(),
          },
        },
      },
      select: {
        id: true,
        email: true,
        user_details: true,
        preferences: true,
        media: true,
      },
      take: usersPerPage,
      skip: (page - 1) * usersPerPage,
    });

    if (getAllUser.length === 0) {
      res.status(200).json({
        message: "No match found!",
      });
      return;
    }

    res.status(200).json({
      user: getAllUser,
    });
  } catch (err) {
    res.status(200).json({
      message: "Server error",
    });
  }
});

export const feedRoutes = router;
