import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Policy'>;

// ─── 개인정보처리방침 ──────────────────────────────────────────────────────────

const PRIVACY_SECTIONS = [
  {
    title: '1. 수집하는 개인정보',
    body: `카카오 로그인 시: 카카오 계정 고유 ID, 닉네임, 프로필 이미지 URL

서비스 이용 중:
• 위치 정보 (GPS) — 주변 화장실 검색 및 현장 방문 인증용. 서버에 저장하지 않습니다.
• 사진 이미지 — 리뷰 작성 시 첨부한 사진. Supabase Storage에 저장됩니다.
• 리뷰 내용 — 별점, 청결도·휴지·비누·보안·비데 체크리스트, 텍스트 코멘트
• 제보 내용 — 장소명, 주소, 위경도 등`,
  },
  {
    title: '2. 수집 및 이용 목적',
    body: `• 회원 식별 및 서비스 제공
• 주변 화장실 검색
• 현장 방문 인증 (50m 이내)
• 리뷰 등록 및 관리
• 화장실 제보 처리
• 북마크 기능 제공
• 서비스 개선 및 오류 분석`,
  },
  {
    title: '3. 보유 및 이용 기간',
    body: `• 회원 정보: 회원 탈퇴 시 즉시 삭제
• 리뷰·제보: 회원 탈퇴 또는 삭제 요청 시 삭제
• 위치 정보: 서버 저장 없음, 기능 실행 시 일시 사용 후 즉시 파기`,
  },
  {
    title: '4. 제3자 제공 및 외부 서비스',
    body: `이용자 동의 없이 제3자에게 개인정보를 제공하지 않습니다.

외부 서비스 연동:
• 카카오 — 소셜 로그인, 지도 서비스
• Supabase — 데이터베이스 및 파일 스토리지
• Apple Maps / Google Maps — 길찾기 연동

각 서비스의 개인정보처리방침이 별도 적용됩니다.`,
  },
  {
    title: '5. 이용자의 권리',
    body: `• 개인정보 열람 요청
• 개인정보 수정 요청
• 개인정보 삭제 요청 (회원 탈퇴)
• 개인정보 처리 정지 요청

문의: khs88189837@gmail.com`,
  },
  {
    title: '6. 아동 보호',
    body: '만 14세 미만 아동의 개인정보를 수집하지 않습니다. 만 14세 미만인 경우 서비스 이용이 제한됩니다.',
  },
  {
    title: '7. 개인정보 보호책임자',
    body: `성명: 김현수\n연락처: khs88189837@gmail.com`,
  },
];

// ─── 이용약관 ──────────────────────────────────────────────────────────────────

const TERMS_SECTIONS = [
  {
    title: '제1조 (목적)',
    body: '이 약관은 화슐랭이 제공하는 화장실 정보 및 리뷰 서비스의 이용 조건과 절차, 이용자와 서비스 간의 권리·의무 관계를 규정함을 목적으로 합니다.',
  },
  {
    title: '제2조 (서비스 제공)',
    body: `• 지도 기반 주변 화장실 검색
• 화장실 상세 정보 조회
• 리뷰 작성·조회·수정·삭제 (회원 전용)
• 화장실 정보 제보 (회원 전용)
• 북마크 기능 (회원 전용)
• 황금칸 — 높은 평점 화장실 랭킹`,
  },
  {
    title: '제3조 (회원 가입 및 탈퇴)',
    body: `• 카카오 계정을 통한 소셜 로그인으로 가입합니다.
• 만 14세 미만은 가입이 제한됩니다.
• 탈퇴 시 개인정보는 즉시 삭제됩니다.`,
  },
  {
    title: '제4조 (리뷰 작성 규칙)',
    body: `다음 내용은 금지됩니다:
• 허위 사실 또는 과장된 내용
• 타인 비방·명예훼손
• 개인정보 포함 (전화번호 등)
• 화장실 비밀번호 숫자 공개
• 광고·홍보성 내용
• 음란물 또는 부적절한 사진
• 저작권·초상권 침해 콘텐츠

위반 시 사전 고지 없이 삭제될 수 있으며, 반복 위반 시 계정 이용이 제한될 수 있습니다.`,
  },
  {
    title: '제5조 (제보 처리)',
    body: `• 제보 내용은 운영자 검토 후 승인·반려됩니다.
• 허위 또는 부적절한 제보는 반려될 수 있습니다.
• 승인된 제보에 대한 별도 보상은 제공되지 않습니다.`,
  },
  {
    title: '제6조 (면책 조항)',
    body: `• 이용자 제공 화장실 정보의 정확성을 보증하지 않습니다.
• 천재지변, 서버 장애 등 불가항력적 사유로 발생한 손해에 대해 책임지지 않습니다.
• 외부 연동 서비스(카카오맵, Apple Maps 등) 장애로 인한 불편에 대해 책임지지 않습니다.`,
  },
  {
    title: '부칙',
    body: '이 약관은 2026년 5월 1일부터 시행합니다.\n\n문의: khs88189837@gmail.com',
  },
];

export default function PolicyScreen({ route }: Props) {
  const insets = useSafeAreaInsets();
  const type = route.params?.type ?? 'privacy';
  const isPrivacy = type === 'privacy';

  const sections = isPrivacy ? PRIVACY_SECTIONS : TERMS_SECTIONS;
  const heading = isPrivacy ? '개인정보처리방침' : '이용약관';
  const effectiveDate = '시행일: 2026년 5월 1일';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
    >
      <Text style={styles.title}>{heading}</Text>
      <Text style={styles.effectiveDate}>{effectiveDate}</Text>

      {sections.map((section, idx) => (
        <View key={idx} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionBody}>{section.body}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundPrimary },
  content: { padding: 20 },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  effectiveDate: {
    fontSize: 12,
    color: colors.textTertiary,
    marginBottom: 24,
  },
  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 21,
  },
});
