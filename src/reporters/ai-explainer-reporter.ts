import { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';
import fs from 'fs';
import path from 'path';
import { FailureExplainer, ExplainerResult } from '../ai/failure-explainer';

export default class AIExplainerReporter implements Reporter {
  private explainer: FailureExplainer;
  private failureReports: Array<{ test: string; file: string; diagnosis: ExplainerResult }> = [];

  constructor() {
    this.explainer = new FailureExplainer();
  }

  async onTestEnd(test: TestCase, result: TestResult): Promise<void> {
    if (result.status !== 'failed' && result.status !== 'timedOut') {
      return;
    }

    const error = result.errors?.[0];
    const errorMessage = error?.message || 'Unknown test failure';
    const stackSnippet = error?.stack ? error.stack.split('\n').slice(0, 5).join('\n') : undefined;

    // Retrieve any DOM snapshots or network attachments added during test run
    let domSnapshot: string | undefined;
    let networkContext: any = undefined;

    for (const attachment of result.attachments) {
      if (attachment.name === 'dom-snapshot' && attachment.body) {
        domSnapshot = attachment.body.toString('utf-8');
      }
      if (attachment.name === 'network-context' && attachment.body) {
        try {
          networkContext = JSON.parse(attachment.body.toString('utf-8'));
        } catch {
          // ignore parsing error
        }
      }
    }

    // Call Failure Explainer
    const diagnosis = await this.explainer.explain({
      testTitle: test.title,
      testFile: path.relative(process.cwd(), test.location.file),
      errorMessage,
      stackSnippet,
      domSnapshot,
      networkContext,
    });

    this.failureReports.push({
      test: test.title,
      file: path.relative(process.cwd(), test.location.file),
      diagnosis,
    });

    // Attach to Playwright HTML Report
    result.attachments.push({
      name: 'ai-failure-explanation.json',
      contentType: 'application/json',
      body: Buffer.from(JSON.stringify(diagnosis, null, 2)),
    });

    result.attachments.push({
      name: 'ai-failure-explanation.md',
      contentType: 'text/markdown',
      body: Buffer.from(
        `# 🤖 AI Failure Explanation\n\n` +
        `**Root Cause**: ${diagnosis.rootCauseSummary}\n\n` +
        `**Explanation**: ${diagnosis.plainEnglishExplanation}\n\n` +
        `**Suggested Fix**: \n\`\`\`typescript\n${diagnosis.suggestedFix}\n\`\`\`\n\n` +
        `*Failure Domain*: \`${diagnosis.failureDomain}\` | *Confidence*: \`${(diagnosis.confidenceScore * 100).toFixed(0)}%\`\n`
      ),
    });

    // Terminal Output
    console.log('\n======================================================');
    console.log(`🤖 [TestMu AI Failure Explainer] - ${test.title}`);
    console.log('------------------------------------------------------');
    console.log(`📌 Root Cause: ${diagnosis.rootCauseSummary}`);
    console.log(`💬 Plain English: ${diagnosis.plainEnglishExplanation}`);
    console.log(`🔧 Suggested Fix: ${diagnosis.suggestedFix}`);
    console.log(`🏷️ Domain: ${diagnosis.failureDomain} | Confidence: ${(diagnosis.confidenceScore * 100).toFixed(0)}%`);
    console.log('======================================================\n');
  }

  async onEnd(result: FullResult): Promise<void> {
    if (this.failureReports.length === 0) return;

    const reportsDir = path.resolve(process.cwd(), 'sample-reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Write sample json
    const jsonPath = path.join(reportsDir, 'failure-explainer-output.json');
    fs.writeFileSync(jsonPath, JSON.stringify(this.failureReports, null, 2), 'utf-8');

    // Write sample markdown
    const mdPath = path.join(reportsDir, 'failure-explainer-output.md');
    let mdContent = `# TestMu AI - Automated Test Failure Explanation Report\n\n`;
    mdContent += `Generated at: ${new Date().toISOString()}\n`;
    mdContent += `Total Failed Tests Analyzed: ${this.failureReports.length}\n\n`;

    for (const report of this.failureReports) {
      mdContent += `## ❌ ${report.test}\n`;
      mdContent += `- **Test File**: \`${report.file}\`\n`;
      mdContent += `- **Failure Domain**: \`${report.diagnosis.failureDomain}\` (Confidence: ${(report.diagnosis.confidenceScore * 100).toFixed(0)}%)\n\n`;
      mdContent += `### Root Cause Summary\n${report.diagnosis.rootCauseSummary}\n\n`;
      mdContent += `### Plain English Explanation\n${report.diagnosis.plainEnglishExplanation}\n\n`;
      mdContent += `### Suggested Fix\n\`\`\`typescript\n${report.diagnosis.suggestedFix}\n\`\`\`\n\n`;
      mdContent += `---\n\n`;
    }

    fs.writeFileSync(mdPath, mdContent, 'utf-8');
    console.log(`[AIExplainerReporter] Failure diagnosis reports written to ${jsonPath} & ${mdPath}`);
  }
}
