import RegistrationReview from '../../components/RegistrationReview';
import { PageHeader } from '../../components/ui';

export default function PlatformRegistrations() {
  return (
    <>
      <PageHeader title="Approvals" subtitle="Universities and standalone institutions asking for admin access. Approving makes the requester an admin." />
      <RegistrationReview />
    </>
  );
}
