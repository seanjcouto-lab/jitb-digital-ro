import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.spec.ts'],
    exclude: [
      'tests/smoke.spec.ts',
      'tests/answerInterpretationService.spec.ts',
      'tests/conversationStateService.spec.ts',
      'tests/domainEventService.spec.ts',
      'tests/domainEventsIntegration.spec.ts',
      'tests/eventSubscribersService.spec.ts',
      'tests/intakeSessionService.spec.ts',
      'tests/intakeWorkflowService.spec.ts',
      'tests/integrationGatewayService.spec.ts',
      'tests/metricsEventHandlerService.spec.ts',
      'tests/notificationService.spec.ts',
      'tests/parkerAdapterService.spec.ts',
      'tests/promptOrchestrationService.spec.ts',
      'tests/vapiAdapterService.spec.ts',
      'node_modules/**',
      'dist/**'
    ],
    environment: 'node',
  },
});
