import { z } from "zod";
import { assignableUserRole, settableUserStatus } from "../../constant";

const updateUser = z.object({
    body: z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        phoneNumber: z.string().optional(),
        bio: z.string().optional(),
        location: z.string().optional(),
    }).strict(),
});

const createUser = z.object({
    body: z.object({
        firstName: z.string({ error: 'First Name is required!' }),
        lastName: z.string({ error: 'Last Name is required!' }),
        email: z.string({ error: 'Email is required!' }).email({
            message: 'Invalid email format!',
        }),
        phoneNumber: z.string({ error: 'Phone Number is required!' }),
        password: z.string({ error: 'Password is required!' }).min(6, {
            message: 'Password must be at least 6 characters',
        }),
        role: z.enum(assignableUserRole).optional(),
    }).strict(),
});

const updateUserRoleSchema = z.object({
    body: z.object({
        role: z.enum(assignableUserRole)
    })
});

const updateUserStatus = z.object({
    body: z.object({
        status: z.enum(settableUserStatus)
    })
});

export const userValidation = {
    updateUser,
    createUser,
    updateUserRoleSchema,
    updateUserStatus,
};
