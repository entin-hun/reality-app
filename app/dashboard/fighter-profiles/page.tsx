import { redirect } from 'next/navigation';

export default function FighterProfilesRedirect() {
  redirect('/dashboard/fighters');
}
