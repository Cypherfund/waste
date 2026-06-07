import { QueryRunner } from 'typeorm';
import { RepairStuckRejectedProviderJobs1786000000000 } from '../1786000000000-repair-stuck-rejected-provider-jobs';

describe('RepairStuckRejectedProviderJobs1786000000000', () => {
  it('skips update when PAYMENT_FAILED was added in current transaction', async () => {
    const query = jest.fn().mockResolvedValueOnce([{ exists: 1 }]);
    const queryRunner = { query } as unknown as QueryRunner;

    await new RepairStuckRejectedProviderJobs1786000000000().up(queryRunner);

    expect(query).toHaveBeenCalledTimes(1);
  });

  it('runs update when PAYMENT_FAILED was not added in current transaction', async () => {
    const query = jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce(undefined);
    const queryRunner = { query } as unknown as QueryRunner;

    await new RepairStuckRejectedProviderJobs1786000000000().up(queryRunner);

    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[1][0]).toContain(`SET "status" = 'PAYMENT_FAILED'`);
  });
});
