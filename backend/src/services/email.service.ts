import nodemailer, { Transporter } from 'nodemailer';
import { config, logger } from '../config';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private transporter: Transporter | null = null;

  constructor() {
    if (config.email.host && config.email.user) {
      this.transporter = nodemailer.createTransport({
        host: config.email.host,
        port: config.email.port || 587,
        secure: config.email.secure,
        auth: {
          user: config.email.user,
          pass: config.email.pass,
        },
      });
      logger.info('Email service: SMTP transport configured');
    } else {
      logger.warn('Email service: SMTP not configured, emails will be logged only');
    }
  }

  private async send(options: EmailOptions): Promise<boolean> {
    const from = config.email.from || `${config.branding.productName} <noreply@seekersai.org>`;

    if (!this.transporter) {
      logger.info('Email service (no SMTP): would send email', {
        to: options.to,
        subject: options.subject,
      });
      return true;
    }

    try {
      await this.transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      logger.info('Email sent', { to: options.to, subject: options.subject });
      return true;
    } catch (error: any) {
      logger.error('Failed to send email', {
        to: options.to,
        subject: options.subject,
        error: error.message,
      });
      return false;
    }
  }

  // ============================================
  // Verification
  // ============================================

  async sendVerificationEmail(email: string, name: string, verificationToken: string): Promise<boolean> {
    const verifyUrl = `${config.app.frontendUrl}/verify-email?token=${verificationToken}`;

    return this.send({
      to: email,
      subject: `Verify your ${config.branding.productName} account`,
      html: `
        <h2>Welcome to ${config.branding.productName}, ${name}!</h2>
        <p>Please verify your email address by clicking the link below:</p>
        <p><a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#4F46E5;color:#fff;text-decoration:none;border-radius:6px;">Verify Email</a></p>
        <p>Or copy this link: ${verifyUrl}</p>
        <p>This link expires in 24 hours.</p>
        <p>— ${config.branding.companyName}</p>
      `,
      text: `Welcome to ${config.branding.productName}, ${name}! Verify your email: ${verifyUrl}`,
    });
  }

  // ============================================
  // Password Reset
  // ============================================

  async sendPasswordResetEmail(email: string, name: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${config.app.frontendUrl}/reset-password?token=${resetToken}`;

    return this.send({
      to: email,
      subject: `Reset your ${config.branding.productName} password`,
      html: `
        <h2>Password Reset</h2>
        <p>Hi ${name}, we received a request to reset your password.</p>
        <p><a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#4F46E5;color:#fff;text-decoration:none;border-radius:6px;">Reset Password</a></p>
        <p>Or copy this link: ${resetUrl}</p>
        <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
        <p>— ${config.branding.companyName}</p>
      `,
      text: `Password reset link: ${resetUrl}`,
    });
  }

  // ============================================
  // Notifications
  // ============================================

  async sendTokenExpiringEmail(email: string, name: string, daysRemaining: number): Promise<boolean> {
    const reconnectUrl = `${config.app.frontendUrl}/settings/meta`;

    return this.send({
      to: email,
      subject: `Action required: Your Meta connection expires in ${daysRemaining} days`,
      html: `
        <h2>Meta Connection Expiring</h2>
        <p>Hi ${name}, your Meta access token will expire in ${daysRemaining} days.</p>
        <p>Please reconnect your Meta account to avoid any service interruption:</p>
        <p><a href="${reconnectUrl}" style="display:inline-block;padding:12px 24px;background:#4F46E5;color:#fff;text-decoration:none;border-radius:6px;">Reconnect Meta</a></p>
        <p>— ${config.branding.companyName}</p>
      `,
      text: `Your Meta connection expires in ${daysRemaining} days. Reconnect at: ${reconnectUrl}`,
    });
  }

  async sendWorkflowCompletedEmail(email: string, name: string, workflowName: string): Promise<boolean> {
    return this.send({
      to: email,
      subject: `Your workflow "${workflowName}" is ready!`,
      html: `
        <h2>Workflow Ready</h2>
        <p>Hi ${name}, your workflow <strong>${workflowName}</strong> has been configured and is now active.</p>
        <p>You can view your workflows in your <a href="${config.app.frontendUrl}/workflows">dashboard</a>.</p>
        <p>— ${config.branding.companyName}</p>
      `,
      text: `Your workflow "${workflowName}" is ready. View at: ${config.app.frontendUrl}/workflows`,
    });
  }

  async sendSubscriptionEmail(
    email: string,
    name: string,
    event: 'upgraded' | 'downgraded' | 'cancelled' | 'renewed',
    planName: string
  ): Promise<boolean> {
    const subjects: Record<string, string> = {
      upgraded: `You've been upgraded to ${planName}!`,
      downgraded: `Your plan has been changed to ${planName}`,
      cancelled: 'Your subscription has been cancelled',
      renewed: `Your ${planName} subscription has been renewed`,
    };

    return this.send({
      to: email,
      subject: subjects[event],
      html: `
        <h2>Subscription ${event.charAt(0).toUpperCase() + event.slice(1)}</h2>
        <p>Hi ${name}, your subscription has been ${event}. Your current plan is <strong>${planName}</strong>.</p>
        <p>View your billing details in your <a href="${config.app.frontendUrl}/settings/billing">dashboard</a>.</p>
        <p>— ${config.branding.companyName}</p>
      `,
      text: `Your subscription has been ${event}. Current plan: ${planName}.`,
    });
  }

  // ============================================
  // Welcome Email
  // ============================================

  async sendWelcomeEmail(email: string, name: string, organizationName: string): Promise<boolean> {
    const dashboardUrl = `${config.app.frontendUrl}/dashboard`;

    return this.send({
      to: email,
      subject: `Welcome to ${config.branding.productName}! 🎉`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #4F46E5;">Welcome to ${config.branding.productName}! 🎉</h1>
          <p>Hi ${name},</p>
          <p>Thank you for creating your account with ${organizationName}. We're excited to have you on board!</p>
          
          <h3>Getting Started</h3>
          <ol>
            <li><strong>Connect your Meta accounts</strong> - Link your Facebook Pages and Instagram accounts</li>
            <li><strong>Create your Knowledge Base</strong> - Add your business information for AI responses</li>
            <li><strong>Request your first workflow</strong> - Set up automated chatbots and comment replies</li>
          </ol>
          
          <p style="margin-top: 24px;">
            <a href="${dashboardUrl}" style="display:inline-block;padding:14px 28px;background:#4F46E5;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Go to Dashboard</a>
          </p>
          
          <p style="margin-top: 24px; color: #666;">Need help? Reply to this email or visit our support center.</p>
          <p style="color: #666;">— The ${config.branding.companyName} Team</p>
        </div>
      `,
      text: `Welcome to ${config.branding.productName}, ${name}! Get started at: ${dashboardUrl}`,
    });
  }

  // ============================================
  // Free Trial Emails
  // ============================================

  async sendTrialStartedEmail(email: string, name: string, trialHours: number, trialEndsAt: Date): Promise<boolean> {
    const dashboardUrl = `${config.app.frontendUrl}/dashboard`;

    return this.send({
      to: email,
      subject: `Your ${trialHours}-hour free trial has started! 🚀`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #10B981;">🎉 Your Free Trial is Active!</h1>
          <p>Hi ${name},</p>
          <p>Great news! Your <strong>${trialHours}-hour free trial</strong> has started. Your AI chatbot is now live and ready to respond to messages!</p>
          
          <div style="background: #F3F4F6; padding: 16px; border-radius: 8px; margin: 24px 0;">
            <p style="margin: 0;"><strong>Trial ends:</strong> ${trialEndsAt.toLocaleString()}</p>
          </div>
          
          <h3>What's included in your trial:</h3>
          <ul>
            <li>✅ AI-powered message responses</li>
            <li>✅ Automatic comment replies</li>
            <li>✅ Real-time webhook integration</li>
          </ul>
          
          <p>To continue enjoying these features after your trial, upgrade to a paid plan.</p>
          
          <p style="margin-top: 24px;">
            <a href="${dashboardUrl}" style="display:inline-block;padding:14px 28px;background:#4F46E5;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">View Dashboard</a>
          </p>
          
          <p style="color: #666;">— ${config.branding.companyName}</p>
        </div>
      `,
      text: `Your ${trialHours}-hour free trial has started! Trial ends: ${trialEndsAt.toLocaleString()}. Visit: ${dashboardUrl}`,
    });
  }

  async sendTrialEndingEmail(email: string, name: string, hoursRemaining: number): Promise<boolean> {
    const upgradeUrl = `${config.app.frontendUrl}/settings/billing`;

    return this.send({
      to: email,
      subject: `⏰ Your free trial ends in ${hoursRemaining} hours`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #F59E0B;">⏰ Your Trial is Ending Soon</h1>
          <p>Hi ${name},</p>
          <p>Your free trial will expire in <strong>${hoursRemaining} hours</strong>.</p>
          <p>To keep your AI chatbot active and continue receiving automated responses, upgrade to a paid plan now.</p>
          
          <p style="margin-top: 24px;">
            <a href="${upgradeUrl}" style="display:inline-block;padding:14px 28px;background:#4F46E5;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Upgrade Now</a>
          </p>
          
          <p style="margin-top: 24px; color: #666;">Questions? Reply to this email and we'll help you choose the right plan.</p>
          <p style="color: #666;">— ${config.branding.companyName}</p>
        </div>
      `,
      text: `Your free trial ends in ${hoursRemaining} hours. Upgrade at: ${upgradeUrl}`,
    });
  }

  async sendTrialExpiredEmail(email: string, name: string): Promise<boolean> {
    const upgradeUrl = `${config.app.frontendUrl}/settings/billing`;

    return this.send({
      to: email,
      subject: `Your free trial has ended`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #EF4444;">Your Free Trial Has Ended</h1>
          <p>Hi ${name},</p>
          <p>Your free trial period has expired. Your AI chatbot is no longer active and won't respond to incoming messages.</p>
          
          <h3>Don't worry, you can reactivate anytime!</h3>
          <p>Upgrade to a paid plan to restore your automated messaging and unlock even more features:</p>
          <ul>
            <li>🚀 Unlimited AI responses</li>
            <li>📊 Advanced analytics</li>
            <li>🎯 Priority support</li>
            <li>🔧 Custom integrations</li>
          </ul>
          
          <p style="margin-top: 24px;">
            <a href="${upgradeUrl}" style="display:inline-block;padding:14px 28px;background:#4F46E5;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Reactivate Now</a>
          </p>
          
          <p style="color: #666;">— ${config.branding.companyName}</p>
        </div>
      `,
      text: `Your free trial has ended. Reactivate at: ${upgradeUrl}`,
    });
  }

  // ============================================
  // Usage Warning Emails
  // ============================================

  async sendUsageWarningEmail(
    email: string,
    name: string,
    metric: string,
    current: number,
    limit: number
  ): Promise<boolean> {
    const percentage = Math.round((current / limit) * 100);
    const upgradeUrl = `${config.app.frontendUrl}/settings/billing`;

    return this.send({
      to: email,
      subject: `⚠️ You've used ${percentage}% of your ${metric} limit`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #F59E0B;">Usage Alert</h1>
          <p>Hi ${name},</p>
          <p>You've used <strong>${percentage}%</strong> of your monthly ${metric} limit.</p>
          
          <div style="background: #FEF3C7; padding: 16px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #F59E0B;">
            <p style="margin: 0;"><strong>Current usage:</strong> ${current.toLocaleString()} / ${limit.toLocaleString()}</p>
          </div>
          
          <p>To avoid service interruptions, consider upgrading your plan for higher limits.</p>
          
          <p style="margin-top: 24px;">
            <a href="${upgradeUrl}" style="display:inline-block;padding:14px 28px;background:#4F46E5;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Upgrade Plan</a>
          </p>
          
          <p style="color: #666;">— ${config.branding.companyName}</p>
        </div>
      `,
      text: `Usage alert: You've used ${percentage}% of your ${metric} limit (${current}/${limit}). Upgrade at: ${upgradeUrl}`,
    });
  }

  async sendUsageLimitReachedEmail(
    email: string,
    name: string,
    metric: string,
    limit: number
  ): Promise<boolean> {
    const upgradeUrl = `${config.app.frontendUrl}/settings/billing`;

    return this.send({
      to: email,
      subject: `🛑 You've reached your ${metric} limit`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #EF4444;">Usage Limit Reached</h1>
          <p>Hi ${name},</p>
          <p>You've reached your monthly ${metric} limit of <strong>${limit.toLocaleString()}</strong>.</p>
          
          <div style="background: #FEE2E2; padding: 16px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #EF4444;">
            <p style="margin: 0;">New ${metric} requests will be blocked until your limit resets or you upgrade.</p>
          </div>
          
          <p>Upgrade now to continue using the service without interruption.</p>
          
          <p style="margin-top: 24px;">
            <a href="${upgradeUrl}" style="display:inline-block;padding:14px 28px;background:#4F46E5;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Upgrade Now</a>
          </p>
          
          <p style="color: #666;">Your limit will reset on the 1st of next month.</p>
          <p style="color: #666;">— ${config.branding.companyName}</p>
        </div>
      `,
      text: `You've reached your ${metric} limit of ${limit}. Upgrade at: ${upgradeUrl}`,
    });
  }

  // ============================================
  // Two-Factor Authentication Emails
  // ============================================

  async send2FAEnabledEmail(email: string, name: string): Promise<boolean> {
    return this.send({
      to: email,
      subject: `🔐 Two-factor authentication enabled`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #10B981;">Two-Factor Authentication Enabled</h1>
          <p>Hi ${name},</p>
          <p>Two-factor authentication has been successfully enabled on your account.</p>
          
          <div style="background: #ECFDF5; padding: 16px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #10B981;">
            <p style="margin: 0;">✅ Your account is now more secure</p>
          </div>
          
          <p><strong>Important:</strong> Make sure you've saved your backup codes in a safe place. You'll need them if you lose access to your authenticator app.</p>
          
          <p style="color: #666;">If you didn't make this change, please contact support immediately.</p>
          <p style="color: #666;">— ${config.branding.companyName}</p>
        </div>
      `,
      text: `Two-factor authentication has been enabled on your account. Save your backup codes in a safe place.`,
    });
  }

  async send2FADisabledEmail(email: string, name: string): Promise<boolean> {
    return this.send({
      to: email,
      subject: `⚠️ Two-factor authentication disabled`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #F59E0B;">Two-Factor Authentication Disabled</h1>
          <p>Hi ${name},</p>
          <p>Two-factor authentication has been disabled on your account.</p>
          
          <div style="background: #FEF3C7; padding: 16px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #F59E0B;">
            <p style="margin: 0;">⚠️ Your account is now less secure</p>
          </div>
          
          <p>We recommend keeping 2FA enabled for maximum security.</p>
          
          <p style="color: #666;">If you didn't make this change, please reset your password and contact support immediately.</p>
          <p style="color: #666;">— ${config.branding.companyName}</p>
        </div>
      `,
      text: `Two-factor authentication has been disabled on your account. If you didn't make this change, contact support.`,
    });
  }
}

export const emailService = new EmailService();
export default emailService;
