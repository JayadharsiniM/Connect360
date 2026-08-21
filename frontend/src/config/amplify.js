import { Amplify } from 'aws-amplify';

export function configureAmplify() {
  const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL || '';
  const userPoolClientId = import.meta.env.VITE_COGNITO_CLIENT_ID || '';

  // Only configure Auth if we have real values (not placeholders)
  if (userPoolId && userPoolClientId && !userPoolId.includes('PLACEHOLDER')) {
    Amplify.configure({
      Auth: {
        Cognito: {
          userPoolId,
          userPoolClientId,
          signUpVerificationMethod: 'code',
        },
      },
    });
  } else {
    console.warn(
      'Cognito not configured. Set VITE_COGNITO_USER_POOL and VITE_COGNITO_CLIENT_ID in .env file after deploying infrastructure.'
    );
  }
}
