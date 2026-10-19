import { UserRoleEnum } from '../../generated/prisma/client';
import * as bcrypt from 'bcrypt';
import config from '../../config';
import { prisma } from '../utils/prisma';

// Email and password come from SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD in the env files.
const superAdminData = {
  firstName: 'Riad',
  lastName: 'Salihin',
  phoneNumber: '+8801212121212',
  role: UserRoleEnum.SUPERADMIN,
  status: 'ACTIVE' as const,
  isAgreeWithTerms: true,
  isEmailVerified: true,
};

const seedSuperAdmin = async () => {
  try {
    // Check if a super admin already exists
    const isSuperAdminExists = await prisma.user.findFirst({
      where: {
        role: UserRoleEnum.SUPERADMIN,
      },
    });

    // If not, create one
    if (!isSuperAdminExists) {
      const email = config.super_admin_email;
      const password = config.super_admin_password;
      if (!email || !password) {
        console.error(
          'Super Admin not created: set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD in the env file.',
        );
        return;
      }

      await prisma.user.create({
        data: {
          ...superAdminData,
          email,
          password: await bcrypt.hash(
            password,
            Number(config.bcrypt_salt_rounds) || 12,
          ),
        },
      });
      console.log('Super Admin created successfully.');
    } else {
      return;
      //   console.log("Super Admin already exists.");
    }
  } catch (error) {
    console.error('Error seeding Super Admin:', error);
  }
};

export default seedSuperAdmin;
