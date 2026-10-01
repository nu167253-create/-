import { RequestItem } from '../types/request';
import { getAccessToken } from './googleAuth';
import { getStatusLabelTh } from './storage';
import { REQUEST_CATEGORIES } from '../data/categories';

export async function exportRequestsToGoogleSlides(
  requests: RequestItem[],
  presentationName: string = 'รายงานสรุปผลงานสารบรรณ_Google_Slides'
): Promise<string> {
  if (!requests || requests.length === 0) {
    throw new Error('ไม่มีข้อมูลคำร้องสำหรับส่งออก');
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('กรุณาลงชื่อเข้าใช้ Google ด้วยบัญชีที่มีสิทธิ์เข้าถึง (Authentication required)');
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const finalTitle = `${presentationName}_${todayStr}`;

  // 1. Create a new Presentation
  const createRes = await fetch('https://slides.googleapis.com/v1/presentations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: finalTitle
    })
  });

  if (!createRes.ok) {
    const errorData = await createRes.json();
    console.error('Failed to create presentation:', errorData);
    throw new Error('ไม่สามารถสร้าง Google Slides ได้');
  }

  const createData = await createRes.json();
  const presentationId = createData.presentationId;
  const firstSlideId = createData.slides[0].objectId;

  // 2. Prepare Data for Summary Slide
  const totalCount = requests.length;
  const approvedCount = requests.filter(r => r.status === 'approved' || r.status === 'completed').length;
  const pendingCount = requests.filter(r => r.status === 'submitted' || r.status === 'under_review' || r.status === 'action_required').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  // 3. Batch Update requests to populate the presentation
  // We'll create a title slide and then a summary slide
  const batchUpdateRequests = [
    // Create a new slide for the summary
    {
      createSlide: {
        objectId: 'summary_slide',
        insertionIndex: 1,
        slideLayoutReference: {
          predefinedLayout: 'TITLE_AND_BODY'
        }
      }
    }
  ];

  // Fetch the presentation again to get the new slide's elements if we wanted to replace text, 
  // but it's easier to just insert text into the newly created slide's placeholder elements if we know their IDs, 
  // OR we can just create new text boxes. Let's create new text boxes.
  
  // Wait, predefined layouts create elements with specific roles, but it's hard to target them without fetching.
  // We can just add text boxes manually or rely on a simpler approach.
  const updateRes = await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requests: [
        // Update the title on the first slide (if it has a TITLE layout, usually it does)
        // We will just create a basic text box on the first slide instead of guessing placeholders.
        {
          createShape: {
            objectId: 'title_box',
            shapeType: 'TEXT_BOX',
            elementProperties: {
              pageObjectId: firstSlideId,
              size: { width: { magnitude: 600, unit: 'PT' }, height: { magnitude: 100, unit: 'PT' } },
              transform: { scaleX: 1, scaleY: 1, translateX: 50, translateY: 150, unit: 'PT' }
            }
          }
        },
        {
          insertText: {
            objectId: 'title_box',
            text: `รายงานสรุปผลงานสารบรรณ\nวันที่: ${new Date().toLocaleDateString('th-TH')}`
          }
        },
        // Create a new slide
        {
          createSlide: {
            objectId: 'summary_slide',
            insertionIndex: 1,
            slideLayoutReference: { predefinedLayout: 'BLANK' }
          }
        },
        // Add text box to new slide
        {
          createShape: {
            objectId: 'summary_box',
            shapeType: 'TEXT_BOX',
            elementProperties: {
              pageObjectId: 'summary_slide',
              size: { width: { magnitude: 600, unit: 'PT' }, height: { magnitude: 300, unit: 'PT' } },
              transform: { scaleX: 1, scaleY: 1, translateX: 50, translateY: 50, unit: 'PT' }
            }
          }
        },
        {
          insertText: {
            objectId: 'summary_box',
            text: `สรุปสถิติภาพรวม:\n\n- จำนวนคำร้องทั้งหมด: ${totalCount} เรื่อง\n- อนุมัติ/แล้วเสร็จ: ${approvedCount} เรื่อง\n- อยู่ระหว่างดำเนินการ: ${pendingCount} เรื่อง\n- ไม่อนุมัติ: ${rejectedCount} เรื่อง`
          }
        }
      ]
    })
  });

  if (!updateRes.ok) {
    const errorData = await updateRes.json();
    console.error('Failed to update presentation:', errorData);
    throw new Error('ไม่สามารถบันทึกข้อมูลลง Google Slides ได้');
  }

  return `https://docs.google.com/presentation/d/${presentationId}/edit`;
}
