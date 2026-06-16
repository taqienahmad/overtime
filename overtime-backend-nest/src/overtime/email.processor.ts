import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EmailService } from './email.service';

export interface ApprovalEmailJobData {
  email: string;
  project: string;
  approvalUrl: string;
  referenceId: number | null;
  cc?: string[];
  extraTo?: string[];
}

@Processor('email')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly emailService: EmailService) {
    super();
  }

  async process(job: Job<ApprovalEmailJobData>) {
    const { email, project, approvalUrl, referenceId, cc, extraTo } = job.data;

    this.logger.log(
      `Processing approval email job ${job.id} for ${email} (attempt ${job.attemptsMade + 1})`,
    );

    await this.emailService.sendApprovalEmail(
      email,
      project,
      approvalUrl,
      referenceId,
      cc,
      extraTo,
    );
  }
}
