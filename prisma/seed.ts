import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // ── Admin EXCLSV — OWNER ──
  const adminPassword = await bcrypt.hash("admin123", 12);
  const owner = await prisma.user.upsert({
    where: { email: "admin@exclsv.com" },
    update: { password: adminPassword },
    create: {
      email: "admin@exclsv.com",
      name: "Admin EXCLSV",
      password: adminPassword,
      role: Role.OWNER,
    },
  });
  console.log(`Owner: ${owner.email} (${owner.id})`);

  // ── Alex Chatter — CHATTER ──
  const chatterPassword = await bcrypt.hash("chatter123", 12);
  const chatter = await prisma.user.upsert({
    where: { email: "chatter@exclsv.com" },
    update: { password: chatterPassword },
    create: {
      email: "chatter@exclsv.com",
      name: "Alex Chatter",
      password: chatterPassword,
      role: Role.CHATTER,
    },
  });
  const existingChatterProfile = await prisma.chatterProfile.findUnique({
    where: { userId: chatter.id },
  });
  if (!existingChatterProfile) {
    await prisma.chatterProfile.create({
      data: {
        userId: chatter.id,
        hourlyRate: 15,
        commissionRate: 5,
        driveLink: "https://drive.google.com/drive/folders/1Si3aITP4OCylufkwqkH8kCtTZEZKzTjr?usp=sharing",
      },
    });
  }
  console.log(`Chatter: ${chatter.email} (${chatter.id})`);

  // ── Leo — OWNER ──
  const leoPassword = await bcrypt.hash("Sauveyleo3.", 12);
  const leo = await prisma.user.upsert({
    where: { email: "leo3elexo3@gmail.com" },
    update: { password: leoPassword },
    create: {
      email: "leo3elexo3@gmail.com",
      name: "Leo",
      password: leoPassword,
      role: Role.OWNER,
    },
  });
  console.log(`Owner: ${leo.email} (${leo.id})`);

  // ── Lelio — MODEL ──
  const lelioPassword = await bcrypt.hash("model123", 12);
  const lelio = await prisma.user.upsert({
    where: { email: "lelio.model@exclsv.com" },
    update: { password: lelioPassword },
    create: {
      email: "lelio.model@exclsv.com",
      name: "Lelio",
      password: lelioPassword,
      role: Role.MODEL,
    },
  });
  const lelioProfile = await prisma.modelProfile.findUnique({
    where: { userId: lelio.id },
  });
  if (!lelioProfile) {
    await prisma.modelProfile.create({
      data: { userId: lelio.id, stageName: "Lelio" },
    });
  }
  console.log(`Model: ${lelio.email} (${lelio.id})`);

  // ── Luna — MODEL (test) ──
  const lunaPassword = await bcrypt.hash("luna123", 12);
  const luna = await prisma.user.upsert({
    where: { email: "luna@exclsv.com" },
    update: { password: lunaPassword },
    create: {
      email: "luna@exclsv.com",
      name: "Luna",
      password: lunaPassword,
      role: Role.MODEL,
    },
  });
  const lunaProfile = await prisma.modelProfile.findUnique({
    where: { userId: luna.id },
  });
  if (!lunaProfile) {
    await prisma.modelProfile.create({
      data: { userId: luna.id, stageName: "Luna" },
    });
  }
  console.log(`Model: ${luna.email} (${luna.id})`);

  // Notifications de test pour l'admin
  const adminNotifCount = await prisma.notification.count({
    where: { userId: owner.id },
  });
  if (adminNotifCount === 0) {
    const now = new Date();
    await prisma.notification.createMany({
      data: [
        {
          userId: owner.id,
          type: "NEW_CUSTOM",
          title: "Nouveau custom créé",
          message: "Alex Chatter a créé un nouveau custom pour Luna.",
          link: "/admin/customs",
          isRead: false,
          createdAt: new Date(now.getTime() - 5 * 60 * 1000), // 5 min ago
        },
        {
          userId: owner.id,
          type: "CUSTOM_STATUS",
          title: "Custom terminé",
          message: "Le custom #1234 de Sophia a été marqué comme terminé.",
          link: "/admin/customs",
          isRead: false,
          createdAt: new Date(now.getTime() - 30 * 60 * 1000), // 30 min ago
        },
        {
          userId: owner.id,
          type: "CUSTOM_MESSAGE",
          title: "Nouveau message",
          message: "Luna a envoyé un message sur le custom vidéo.",
          link: "/admin/customs",
          isRead: false,
          createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2h ago
        },
        {
          userId: owner.id,
          type: "INVOICE_READY",
          title: "Facture prête",
          message: "La facture de mars pour Luna est prête à envoyer.",
          link: "/admin/finance",
          isRead: true,
          createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 1 day ago
        },
        {
          userId: owner.id,
          type: "NEW_CUSTOM",
          title: "Nouveau custom créé",
          message: "Alex Chatter a créé un custom photo pour Sophia.",
          link: "/admin/customs",
          isRead: true,
          createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000), // 2 days ago
        },
        {
          userId: owner.id,
          type: "CUSTOM_STATUS",
          title: "Custom en cours",
          message: "Sophia a commencé à travailler sur le custom combo.",
          link: "/admin/customs",
          isRead: true,
          createdAt: new Date(now.getTime() - 72 * 60 * 60 * 1000), // 3 days ago
        },
      ],
    });
    console.log("Admin notifications created.");
  }

  // Notifications de test pour le chatter
  const chatterNotifCount = await prisma.notification.count({
    where: { userId: chatter.id },
  });
  if (chatterNotifCount === 0) {
    const now = new Date();
    await prisma.notification.createMany({
      data: [
        {
          userId: chatter.id,
          type: "CUSTOM_STATUS",
          title: "Custom en cours",
          message: "Luna a commencé le custom vidéo que vous avez créé.",
          link: "/chatter/customs",
          isRead: false,
          createdAt: new Date(now.getTime() - 10 * 60 * 1000),
        },
        {
          userId: chatter.id,
          type: "CUSTOM_MESSAGE",
          title: "Nouveau message de Luna",
          message: "Luna a posé une question sur le custom lingerie.",
          link: "/chatter/customs",
          isRead: false,
          createdAt: new Date(now.getTime() - 60 * 60 * 1000),
        },
        {
          userId: chatter.id,
          type: "CUSTOM_STATUS",
          title: "Custom terminé",
          message: "Luna a terminé le custom photo.",
          link: "/chatter/customs",
          isRead: true,
          createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        },
      ],
    });
    console.log("Chatter notifications created.");
  }

  console.log("Seed completed.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
