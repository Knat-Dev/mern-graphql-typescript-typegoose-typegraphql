import crypto from 'crypto';

export const generateResetPasswordToken = () => {
    return crypto.randomBytes(20).toString('hex');
};
