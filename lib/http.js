// Small helpers for API responses + friendly database error messages
export const json = (data, status = 200) => Response.json(data, { status });
export const fail = (message, status = 400) => Response.json({ error: message }, { status });

export function dbError(e) {
  if (e.code === '23505') return fail('That value already exists (duplicate).', 409);
  if (e.code === '23514') return fail(`Invalid value (rule "${e.constraint}" failed).`, 400);
  if (e.code === '23503') return fail('This record is linked to other records.', 409);
  if (e.code === '23502') return fail('A required field is missing.', 400);
  if (e.code === 'P0001') return fail(e.message, 400); // RAISE EXCEPTION from our triggers
  console.error(e);
  return fail('Server error: ' + e.message, 500);
}
