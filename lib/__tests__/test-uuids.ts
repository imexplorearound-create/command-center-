/**
 * UUIDs v4-shaped para uso em testes. Zod strict rejeita UUIDs que não
 * respeitem o version nibble (4º nibble do 3º grupo = 4) e variant nibble
 * (1º nibble do 4º grupo em [8,9,a,b]). Usar estes evita falsos negativos
 * em `z.string().uuid()` checks nos action tests.
 */
export const TEST_TENANT_UUID = "a1111111-1111-4111-9111-111111111111";
export const TEST_PROJECT_UUID = "b2222222-2222-4222-9222-222222222222";
export const TEST_PROJECT_UUID_2 = "b2222222-2222-4222-9222-222222222223";
export const TEST_FEEDBACK_UUID = "c3333333-3333-4333-9333-333333333333";
export const TEST_FEEDBACK_UUID_2 = "c3333333-3333-4333-9333-333333333334";
export const TEST_TEST_CASE_UUID = "d4444444-4444-4444-9444-444444444444";
export const TEST_TASK_UUID = "e5555555-5555-4555-9555-555555555555";
export const TEST_USER_UUID = "f6666666-6666-4666-9666-666666666666";
export const TEST_PERSON_UUID = "07777777-7777-4777-9777-777777777777";
