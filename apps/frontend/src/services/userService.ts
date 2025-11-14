import axios from 'axios';
import { API_URL } from '../config';

interface ChangePinPayload {
  currentPin: string;
  newPin: string;
}

export async function changePin(payload: ChangePinPayload): Promise<void> {
  await axios.patch(`${API_URL}/api/v1/users/me/change-pin`, payload);
}

