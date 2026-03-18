import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 12);

  const owner = await prisma.user.upsert({
    where: { email: "admin@exclsv.com" },
    update: {},
    create: {
      email: "admin@exclsv.com",
      name: "Admin EXCLSV",
      password: hashedPassword,
      role: Role.OWNER,
    },
  });

  console.log(`Seed completed. Owner created: ${owner.email} (${owner.id})`);
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
