import { getChallengeById } from '@/challenges/registry';
import { notFound } from 'next/navigation';
import { PlayClient } from './PlayClient';

type Props = { params: Promise<{ challengeId: string }> };

export default async function PlayPage({ params }: Props) {
  const { challengeId } = await params;
  const challenge = getChallengeById(challengeId);
  if (!challenge) notFound();
  return <PlayClient challengeId={challengeId} />;
}
