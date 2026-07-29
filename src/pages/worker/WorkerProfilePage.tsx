import { useMemo, useState } from "react";
import { AppLayout } from "../../components/layout/AppLayout";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useWorkerScope } from "../../utils/workerAccess";
import { useRepositorySnapshot } from "../../hooks/useRepositoryState";
import { useProfileSettings } from "../../hooks/useProfileSettings";
import { attendanceRepository, employeeDocumentsRepository, materialRequestsRepository, photoReportsRepository, usersRepository } from "../../data/repositories";
import { todayIso } from "../../utils/workerAnalytics";
import { computeProfileActivity, computeProfileKpis, computeProfileStats } from "../../utils/workerProfileAnalytics";
import { ProfileKpis } from "../../components/worker/profile/ProfileKpis";
import { ProfileIdentityCard } from "../../components/worker/profile/ProfileIdentityCard";
import { ProfessionalInfoCard } from "../../components/worker/profile/ProfessionalInfoCard";
import { PersonalInfoCard } from "../../components/worker/profile/PersonalInfoCard";
import { SkillsCard } from "../../components/worker/profile/SkillsCard";
import { ProfileStatisticsCard } from "../../components/worker/profile/ProfileStatisticsCard";
import { RecentActivityCard } from "../../components/worker/profile/RecentActivityCard";
import { ProfileSettingsCard } from "../../components/worker/profile/ProfileSettingsCard";
import { DocumentsCard } from "../../components/worker/profile/DocumentsCard";
import { EditProfileModal } from "../../components/worker/profile/EditProfileModal";
import { ChangePhotoModal } from "../../components/worker/profile/ChangePhotoModal";

export default function WorkerProfilePage() {
  const { user } = useAuth();
  const { strings } = useLanguage();
  const s = strings.worker;
  const { employee, brigade, object, prorab, brigadeWorks } = useWorkerScope(user);
  const users = useRepositorySnapshot(usersRepository);
  const account = users.find((u) => u.id === user?.id);
  const attendance = useRepositorySnapshot(attendanceRepository);
  const allPhotoReports = useRepositorySnapshot(photoReportsRepository);
  const allMaterialRequests = useRepositorySnapshot(materialRequestsRepository);
  const allDocuments = useRepositorySnapshot(employeeDocumentsRepository);
  const { settings, update: updateSettings } = useProfileSettings();

  const [editOpen, setEditOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);

  const today = todayIso();

  const myPhotoReports = useMemo(() => (employee ? allPhotoReports.filter((r) => r.employeeId === employee.id) : []), [allPhotoReports, employee]);
  const myDocuments = useMemo(() => (employee ? allDocuments.filter((d) => d.employeeId === employee.id) : []), [allDocuments, employee]);

  const kpis = useMemo(() => (employee ? computeProfileKpis(employee, brigadeWorks, attendance, today) : null), [employee, brigadeWorks, attendance, today]);
  const stats = useMemo(() => (kpis ? computeProfileStats(brigadeWorks, myPhotoReports, kpis.attendancePercent) : null), [brigadeWorks, myPhotoReports, kpis]);
  const activity = useMemo(
    () => (employee ? computeProfileActivity(employee, brigade?.name ?? null, attendance, myPhotoReports, allMaterialRequests, brigadeWorks, today) : []),
    [employee, brigade, attendance, myPhotoReports, allMaterialRequests, brigadeWorks, today],
  );

  if (!user || !employee || !kpis || !stats) {
    return (
      <AppLayout title={s.profilePageTitle} subtitle={s.profilePageSubtitle} titleBelowHeader contentMaxWidth="1600px">
        <Card className="p-0">
          <EmptyState title={s.emptyTasks} />
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={s.profilePageTitle} subtitle={s.profilePageSubtitle} titleBelowHeader contentMaxWidth="1600px">
      <div className="space-y-4">
        <ProfileKpis kpis={kpis} />

        <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-3">
          <ProfileIdentityCard employee={employee} email={account?.email} onEdit={() => setEditOpen(true)} onChangePhoto={() => setPhotoOpen(true)} />
          <ProfessionalInfoCard employee={employee} objectName={object?.name ?? null} brigadeName={brigade?.name ?? null} prorabName={prorab?.fullName ?? null} experienceYears={kpis.experienceYears} />
          <ProfileStatisticsCard stats={stats} />

          <PersonalInfoCard employee={employee} />
          <SkillsCard skills={employee.skills ?? []} />
          <RecentActivityCard items={activity} todayIso={today} />

          <div className="lg:col-span-2">
            <DocumentsCard documents={myDocuments} />
          </div>
          <ProfileSettingsCard settings={settings} onUpdate={updateSettings} />
        </div>
      </div>

      <EditProfileModal open={editOpen} onClose={() => setEditOpen(false)} employee={employee} account={account} />
      <ChangePhotoModal open={photoOpen} onClose={() => setPhotoOpen(false)} employee={employee} />
    </AppLayout>
  );
}
