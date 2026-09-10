const db = require('../../database/db');
const { ApiError } = require('../../core/ApiError');

async function listByRoomType(roomTypeId) {
  const ratePlans = await db('rate_plans').where({ room_type_id: roomTypeId });

  return Promise.all(
    ratePlans.map(async (plan) => ({
      ...plan,
      inclusions: await db('rate_plan_inclusions').where({ rate_plan_id: plan.id }).select('id', 'label'),
      cancellationPolicy: await db('cancellation_policies')
        .where({ rate_plan_id: plan.id })
        .orderBy('sort_order'),
    }))
  );
}

async function createRatePlan(roomTypeId, body) {
  const { name, price, meal_inclusion, refundable, inclusions = [], cancellationSlabs = [] } = body;

  if (!name || price === undefined) {
    throw ApiError.badRequest('Rate plan name and price are required');
  }
  if (Number(price) < 0) {
    throw ApiError.badRequest('Price must be >= 0');
  }

  return db.transaction(async (trx) => {
    const [plan] = await trx('rate_plans')
      .insert({
        room_type_id: roomTypeId,
        name,
        price,
        meal_inclusion: meal_inclusion || 'no_meals',
        refundable: refundable ?? true,
      })
      .returning('*');

    if (inclusions.length) {
      await trx('rate_plan_inclusions').insert(
        inclusions.map((label) => ({ rate_plan_id: plan.id, label }))
      );
    }

    if (cancellationSlabs.length) {
      await trx('cancellation_policies').insert(
        cancellationSlabs.map((slab, index) => ({
          rate_plan_id: plan.id,
          days_before_checkin: slab.daysBeforeCheckin,
          refund_percent: slab.refundPercent,
          sort_order: index,
        }))
      );
    }

    return plan;
  });
}

async function updateRatePlan(id, body) {
  const existing = await db('rate_plans').where({ id }).first();
  if (!existing) throw ApiError.notFound('Rate plan not found');

  const { name, price, meal_inclusion, refundable, status, inclusions, cancellationSlabs } = body;
  if (price !== undefined && Number(price) < 0) {
    throw ApiError.badRequest('Price must be >= 0');
  }

  return db.transaction(async (trx) => {
    const [plan] = await trx('rate_plans')
      .where({ id })
      .update({
        name: name ?? existing.name,
        price: price ?? existing.price,
        meal_inclusion: meal_inclusion ?? existing.meal_inclusion,
        refundable: refundable ?? existing.refundable,
        status: status ?? existing.status,
      })
      .returning('*');

    if (inclusions) {
      await trx('rate_plan_inclusions').where({ rate_plan_id: plan.id }).del();
      if (inclusions.length) {
        await trx('rate_plan_inclusions').insert(inclusions.map((label) => ({ rate_plan_id: plan.id, label })));
      }
    }

    if (cancellationSlabs) {
      await trx('cancellation_policies').where({ rate_plan_id: plan.id }).del();
      if (cancellationSlabs.length) {
        await trx('cancellation_policies').insert(
          cancellationSlabs.map((slab, index) => ({
            rate_plan_id: plan.id,
            days_before_checkin: slab.daysBeforeCheckin,
            refund_percent: slab.refundPercent,
            sort_order: index,
          }))
        );
      }
    }

    return plan;
  });
}

async function deactivateRatePlan(id) {
  const existing = await db('rate_plans').where({ id }).first();
  if (!existing) throw ApiError.notFound('Rate plan not found');

  await db('rate_plans').where({ id }).update({ status: 'inactive' });
}

module.exports = { listByRoomType, createRatePlan, updateRatePlan, deactivateRatePlan };
