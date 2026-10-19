import { UserRoleEnum } from '../../generated/prisma/client';
import * as bcrypt from 'bcrypt';
import config from '../../config';
import { prisma } from '../utils/prisma';

const superAdminData = {
  firstName: 'Riad',
  lastName: 'Salihin',
  email: 'riadadmin@gmail.com',
  password: 'Riad@2345',
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
      superAdminData.password = await bcrypt.hash(
        config.super_admin_password as string,
        Number(config.bcrypt_salt_rounds) || 12,
      );
      await prisma.user.create({
        data: superAdminData,
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
