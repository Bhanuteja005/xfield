import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Section } from '../../../components/studio/section';
import { SECTION_TITLES, isSection } from '../../../lib/sections';

interface PageProps {
  params: Promise<{ section: string }>;
}

export const dynamicParams = false;

export const generateStaticParams = () =>
  Object.keys(SECTION_TITLES).map((section) => ({ section }));

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { section } = await params;
  return isSection(section) ? { title: SECTION_TITLES[section] } : {};
}

export default async function SectionPage({ params }: PageProps) {
  const { section } = await params;
  if (!isSection(section)) notFound();
  return <Section name={section} />;
}
