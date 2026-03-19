// Usage: node scripts/reset-password.js [email] [newPassword]
// Default: admin@exclsv.com / admin123

const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] || "admin@exclsv.com";
  const newPassword = process.argv[3] || "admin123";

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`Aucun user trouvé avec l'email: ${email}`);
    process.exit(1);
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { email },
    data: { password: hash },
  });

  console.log(`Mot de passe réinitialisé pour ${email} (role: ${user.role})`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
