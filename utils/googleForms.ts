import { getAccessToken } from './googleAuth';
import { RequestItem } from '../types/request';

export interface GoogleFormInfo {
  formId: string;
  title: string;
  documentTitle?: string;
  description?: string;
  responderUri: string;
  editUri: string;
  createdAt: string;
  templateType: 'satisfaction_survey' | 'cctv_request' | 'camera_maintenance' | 'custom';
}

export interface GoogleFormResponseItem {
  responseId: string;
  createTime: string;
  lastSubmittedTime: string;
  respondentEmail?: string;
  answers: Record<string, {
    questionId: string;
    textAnswers?: {
      answers: Array<{ value: string }>;
    };
  }>;
}

export interface GoogleFormDetails {
  formId: string;
  info: {
    title: string;
    documentTitle?: string;
    description?: string;
  };
  responderUri: string;
  revisionId?: string;
  items?: Array<{
    itemId: string;
    title: string;
    description?: string;
    questionItem?: {
      question: {
        questionId: string;
        required?: boolean;
        textQuestion?: { paragraph?: boolean };
        choiceQuestion?: { type: string; options: Array<{ value: string }> };
        scaleQuestion?: { low: number; high: number; lowLabel?: string; highLabel?: string };
        dateQuestion?: { includeTime?: boolean; includeYear?: boolean };
        timeQuestion?: { duration?: boolean };
      };
    };
  }>;
}

const STORAGE_KEY_SAVED_FORMS = 'cctv_google_forms_history_v1';

export function getSavedGoogleForms(): GoogleFormInfo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SAVED_FORMS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse saved Google Forms from localStorage:', e);
    return [];
  }
}

export function saveGoogleFormToHistory(form: GoogleFormInfo) {
  try {
    const existing = getSavedGoogleForms();
    const filtered = existing.filter(f => f.formId !== form.formId);
    const updated = [form, ...filtered];
    localStorage.setItem(STORAGE_KEY_SAVED_FORMS, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save Google Form to history:', e);
  }
}

export function removeGoogleFormFromHistory(formId: string) {
  try {
    const existing = getSavedGoogleForms();
    const updated = existing.filter(f => f.formId !== formId);
    localStorage.setItem(STORAGE_KEY_SAVED_FORMS, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to remove Google Form from history:', e);
  }
}

/**
 * Creates a Citizen CCTV Service Satisfaction Survey Google Form
 */
export async function createCctvSatisfactionSurveyGoogleForm(
  surveyTitle: string = 'แบบประเมินความพึงพอใจการให้บริการขอดูภาพ CCTV เทศบาลเมืองชัยภูมิ'
): Promise<GoogleFormInfo> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('กรุณาลงชื่อเข้าใช้ Google ด้วยบัญชีที่มีสิทธิ์เข้าถึง (Authentication required)');
  }

  // 1. Create Base Form
  const createRes = await fetch('https://forms.googleapis.com/v1/forms', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      info: {
        title: surveyTitle,
        documentTitle: `${surveyTitle} (เทศบาลเมืองชัยภูมิ)`
      }
    })
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    throw new Error(err.error?.message || 'ไม่สามารถสร้าง Google Form ได้');
  }

  const createdForm = await createRes.json();
  const formId = createdForm.formId;

  // 2. Batch Update: Add Description and Standard Municipal Satisfaction Questions
  const updateRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requests: [
        {
          updateFormInfo: {
            info: {
              description: 'แบบประเมินความพึงพอใจการให้บริการประชาชนในการขอตรวจสอบและคัดลอกข้อมูลภาพจากกล้องโทรทัศน์วงจรปิด (CCTV) เทศบาลเมืองชัยภูมิ ข้อมูลที่ได้จะนำไปพัฒนาและปรับปรุงคุณภาพการให้บริการให้ดียิ่งขึ้น'
            },
            updateMask: 'description'
          }
        },
        {
          createItem: {
            item: {
              title: 'เลขที่คำร้อง CCTV (ถ้ามี)',
              description: 'ระบุรหัสคำร้อง เช่น REQ-2026-XXXXX เพื่อให้อ้างอิงการให้บริการได้ถูกต้อง',
              questionItem: {
                question: {
                  required: false,
                  textQuestion: { paragraph: false }
                }
              }
            },
            location: { index: 0 }
          }
        },
        {
          createItem: {
            item: {
              title: 'ชื่อ-นามสกุล ของผู้รับบริการ (ไม่ระบุก็ได้)',
              questionItem: {
                question: {
                  required: false,
                  textQuestion: { paragraph: false }
                }
              }
            },
            location: { index: 1 }
          }
        },
        {
          createItem: {
            item: {
              title: 'ความรวดเร็วและขั้นตอนในการให้บริการ',
              description: 'ความรวดเร็วตั้งแต่ขั้นตอนการยื่นคำร้อง จนถึงการได้รับแจ้งผลหรือรับไฟล์ภาพ',
              questionItem: {
                question: {
                  required: true,
                  scaleQuestion: {
                    low: 1,
                    high: 5,
                    lowLabel: 'น้อยที่สุด (ปรับปรุง)',
                    highLabel: 'มากที่สุด (ยอดเยี่ยม)'
                  }
                }
              }
            },
            location: { index: 2 }
          }
        },
        {
          createItem: {
            item: {
              title: 'ความคมชัดและคุณภาพของไฟล์ภาพ/วิดีโอจากกล้อง CCTV',
              description: 'ความชัดเจนของมุมกล้อง สภาพแสง และความต่อเนื่องของเหตุการณ์ที่บันทึกได้',
              questionItem: {
                question: {
                  required: true,
                  scaleQuestion: {
                    low: 1,
                    high: 5,
                    lowLabel: 'น้อยที่สุด (ไม่ชัดเจน)',
                    highLabel: 'มากที่สุด (คมชัดมาก)'
                  }
                }
              }
            },
            location: { index: 3 }
          }
        },
        {
          createItem: {
            item: {
              title: 'ความสุภาพและการให้คำแนะนำของเจ้าหน้าที่ผู้ให้บริการ',
              questionItem: {
                question: {
                  required: true,
                  scaleQuestion: {
                    low: 1,
                    high: 5,
                    lowLabel: 'น้อยที่สุด',
                    highLabel: 'มากที่สุด'
                  }
                }
              }
            },
            location: { index: 4 }
          }
        },
        {
          createItem: {
            item: {
              title: 'ความพึงพอใจในภาพรวมต่อศูนย์บริการกล้อง CCTV เทศบาลเมืองชัยภูมิ',
              questionItem: {
                question: {
                  required: true,
                  scaleQuestion: {
                    low: 1,
                    high: 5,
                    lowLabel: 'ไม่พึงพอใจ',
                    highLabel: 'พึงพอใจสูงสุด'
                  }
                }
              }
            },
            location: { index: 5 }
          }
        },
        {
          createItem: {
            item: {
              title: 'ข้อเสนอแนะเพิ่มเติมเพื่อการปรับปรุงการให้บริการ',
              questionItem: {
                question: {
                  required: false,
                  textQuestion: { paragraph: true }
                }
              }
            },
            location: { index: 6 }
          }
        }
      ]
    })
  });

  if (!updateRes.ok) {
    console.warn('Form batchUpdate warning:', await updateRes.text());
  }

  const formInfo: GoogleFormInfo = {
    formId,
    title: surveyTitle,
    documentTitle: `${surveyTitle} (เทศบาลเมืองชัยภูมิ)`,
    description: 'แบบประเมินความพึงพอใจการให้บริการประชาชนในการขอตรวจสอบและคัดลอกข้อมูลภาพจากกล้อง CCTV เทศบาลเมืองชัยภูมิ',
    responderUri: createdForm.responderUri || `https://docs.google.com/forms/d/e/${formId}/viewform`,
    editUri: `https://docs.google.com/forms/d/${formId}/edit`,
    createdAt: new Date().toISOString(),
    templateType: 'satisfaction_survey'
  };

  saveGoogleFormToHistory(formInfo);
  return formInfo;
}

/**
 * Creates a Citizen CCTV Online Request Submission Google Form
 */
export async function createCctvRequestIntakeGoogleForm(
  formTitle: string = 'แบบยื่นคำร้องขอดูภาพกล้องวงจรปิด CCTV เทศบาลเมืองชัยภูมิ (Google Forms Intake)'
): Promise<GoogleFormInfo> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('กรุณาลงชื่อเข้าใช้ Google ด้วยบัญชีที่มีสิทธิ์เข้าถึง (Authentication required)');
  }

  const createRes = await fetch('https://forms.googleapis.com/v1/forms', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      info: {
        title: formTitle,
        documentTitle: `${formTitle}`
      }
    })
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    throw new Error(err.error?.message || 'ไม่สามารถสร้าง Google Form ได้');
  }

  const createdForm = await createRes.json();
  const formId = createdForm.formId;

  const updateRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requests: [
        {
          updateFormInfo: {
            info: {
              description: 'แบบฟอร์มรับคำร้องออนไลน์สำหรับการขอตรวจสอบ ดูภาพ หรือขอคัดลอกไฟล์ภาพจากกล้องโทรทัศน์วงจรปิด (CCTV) ในเขตเทศบาลเมืองชัยภูมิ สำหรับประชาชน หน่วยงานราชการ หรือเจ้าหน้าที่ตำรวจ'
            },
            updateMask: 'description'
          }
        },
        {
          createItem: {
            item: {
              title: 'ชื่อ-นามสกุล ของผู้ยื่นคำร้อง (พร้อมคำนำหน้า)',
              description: 'เช่น นายสมชาย ใจดี หรือ ร.ต.อ. อนุชา กล้าหาญ',
              questionItem: {
                question: {
                  required: true,
                  textQuestion: { paragraph: false }
                }
              }
            },
            location: { index: 0 }
          }
        },
        {
          createItem: {
            item: {
              title: 'หมายเลขบัตรประจำตัวประชาชน / หนังสือเดินทาง / รหัสข้าราชการ',
              questionItem: {
                question: {
                  required: true,
                  textQuestion: { paragraph: false }
                }
              }
            },
            location: { index: 1 }
          }
        },
        {
          createItem: {
            item: {
              title: 'เบอร์โทรศัพท์มือถือที่สามารถติดต่อได้สะดวก',
              questionItem: {
                question: {
                  required: true,
                  textQuestion: { paragraph: false }
                }
              }
            },
            location: { index: 2 }
          }
        },
        {
          createItem: {
            item: {
              title: 'อีเมล (Email) สำหรับรับการแจ้งเตือนและลิงก์ไฟล์ภาพ',
              questionItem: {
                question: {
                  required: false,
                  textQuestion: { paragraph: false }
                }
              }
            },
            location: { index: 3 }
          }
        },
        {
          createItem: {
            item: {
              title: 'ประเภทการขอรับบริการ CCTV',
              questionItem: {
                question: {
                  required: true,
                  choiceQuestion: {
                    type: 'RADIO',
                    options: [
                      { value: 'ขอดูภาพเหตุการณ์ (ไม่ขอคัดลอกไฟล์)' },
                      { value: 'ขอคัดลอกไฟล์ข้อมูลภาพ (ต้องมีบันทึกประจำวันหรือหนังสือราชการ)' },
                      { value: 'ขอข้อมูลเพื่อประกอบคดีความ / ประกันภัย' },
                      { value: 'แจ้งเบาะแสเหตุการณ์ / ตรวจสอบความปลอดภัย' }
                    ]
                  }
                }
              }
            },
            location: { index: 4 }
          }
        },
        {
          createItem: {
            item: {
              title: 'วันและเวลาที่เกิดเหตุการณ์',
              description: 'ระบุวันที่และช่วงเวลาเกิดเหตุโดยประมาณ (เช่น 30 สิงหาคม 2569 เวลาประมาณ 14:30 - 15:15 น.)',
              questionItem: {
                question: {
                  required: true,
                  textQuestion: { paragraph: false }
                }
              }
            },
            location: { index: 5 }
          }
        },
        {
          createItem: {
            item: {
              title: 'สถานที่ / บริเวณ / จุดแยกที่เกิดเหตุ (ในเขตเทศบาลเมืองชัยภูมิ)',
              description: 'ระบุชื่อถนน ทางแยก จุดสังเกต หรือพิกัดใกล้เคียง เช่น สี่แยกโรงพยาบาลชัยภูมิ, ถนนหฤทัย หน้าร้านสะดวกซื้อ',
              questionItem: {
                question: {
                  required: true,
                  textQuestion: { paragraph: true }
                }
              }
            },
            location: { index: 6 }
          }
        },
        {
          createItem: {
            item: {
              title: 'รายละเอียดเหตุการณ์ / ยานพาหนะ / บุคคลที่เกี่ยวข้อง',
              description: 'ระบุยี่ห้อ สี ทะเบียนรถ ลักษณะการแต่งกาย หรือเหตุการณ์ที่เกิดขึ้นโดยสังเขป',
              questionItem: {
                question: {
                  required: true,
                  textQuestion: { paragraph: true }
                }
              }
            },
            location: { index: 7 }
          }
        },
        {
          createItem: {
            item: {
              title: 'เลขที่ประจำวันรับแจ้ง / สถานีตำรวจ (ถ้ามี)',
              description: 'เช่น ประจำวันข้อที่ 4 ลงวันที่ 30 ส.ค. 69 สภ.เมืองชัยภูมิ',
              questionItem: {
                question: {
                  required: false,
                  textQuestion: { paragraph: false }
                }
              }
            },
            location: { index: 8 }
          }
        }
      ]
    })
  });

  if (!updateRes.ok) {
    console.warn('Form batchUpdate warning:', await updateRes.text());
  }

  const formInfo: GoogleFormInfo = {
    formId,
    title: formTitle,
    documentTitle: formTitle,
    description: 'แบบฟอร์มรับคำร้องออนไลน์สำหรับการขอตรวจสอบ ดูภาพ หรือขอคัดลอกไฟล์ภาพจากกล้อง CCTV เทศบาลเมืองชัยภูมิ',
    responderUri: createdForm.responderUri || `https://docs.google.com/forms/d/e/${formId}/viewform`,
    editUri: `https://docs.google.com/forms/d/${formId}/edit`,
    createdAt: new Date().toISOString(),
    templateType: 'cctv_request'
  };

  saveGoogleFormToHistory(formInfo);
  return formInfo;
}

/**
 * Creates a CCTV Camera Maintenance and Field Inspection Google Form
 */
export async function createCameraMaintenanceGoogleForm(
  formTitle: string = 'แบบบันทึกตรวจสภาพและซ่อมบำรุงกล้องวงจรปิด CCTV ภาคสนาม เทศบาลเมืองชัยภูมิ'
): Promise<GoogleFormInfo> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('กรุณาลงชื่อเข้าใช้ Google ด้วยบัญชีที่มีสิทธิ์เข้าถึง (Authentication required)');
  }

  const createRes = await fetch('https://forms.googleapis.com/v1/forms', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      info: {
        title: formTitle,
        documentTitle: formTitle
      }
    })
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    throw new Error(err.error?.message || 'ไม่สามารถสร้าง Google Form ได้');
  }

  const createdForm = await createRes.json();
  const formId = createdForm.formId;

  const updateRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requests: [
        {
          updateFormInfo: {
            info: {
              description: 'แบบฟอร์มสำหรับช่างเทคนิคและเจ้าหน้าที่ศูนย์ CCTV ในการลงพื้นที่ตรวจสอบความพร้อมใช้งาน สภาพเลนส์ ระบบไฟฟ้า เครือข่าย และบันทึกผลการบำรุงรักษากล้องวงจรปิดภาคสนาม'
            },
            updateMask: 'description'
          }
        },
        {
          createItem: {
            item: {
              title: 'ชื่อ-นามสกุล ช่างเทคนิค / เจ้าหน้าที่ผู้ตรวจสภาพ',
              questionItem: {
                question: {
                  required: true,
                  textQuestion: { paragraph: false }
                }
              }
            },
            location: { index: 0 }
          }
        },
        {
          createItem: {
            item: {
              title: 'รหัสกล้อง CCTV (Camera ID)',
              description: 'เช่น CAM-001, CAM-015, CAM-032',
              questionItem: {
                question: {
                  required: true,
                  textQuestion: { paragraph: false }
                }
              }
            },
            location: { index: 1 }
          }
        },
        {
          createItem: {
            item: {
              title: 'สถานที่ / จุดติดตั้งกล้อง CCTV',
              questionItem: {
                question: {
                  required: true,
                  textQuestion: { paragraph: false }
                }
              }
            },
            location: { index: 2 }
          }
        },
        {
          createItem: {
            item: {
              title: 'สถานะการทำงานของตัวกล้อง (Camera Hardware Status)',
              questionItem: {
                question: {
                  required: true,
                  choiceQuestion: {
                    type: 'RADIO',
                    options: [
                      { value: 'ปกติ (Online & Recording)' },
                      { value: 'ภาพเบลอ / เลนส์สกปรก (Blurry / Dirty Lens)' },
                      { value: 'ไฟตก / ดับ (Power Issue)' },
                      { value: 'สัญญาณเครือข่ายหลุด (Offline / Network Loss)' },
                      { value: 'กล้องชำรุดเสียหาย / โดนเฉี่ยวชน (Physical Damage)' }
                    ]
                  }
                }
              }
            },
            location: { index: 3 }
          }
        },
        {
          createItem: {
            item: {
              title: 'การหมุนส่าย ซูม และการตอบสนอง PTZ (ถ้ามี)',
              questionItem: {
                question: {
                  required: false,
                  choiceQuestion: {
                    type: 'RADIO',
                    options: [
                      { value: 'หมุนตอบสนองปกติ' },
                      { value: 'ติดขัด / หมุนไม่ได้' },
                      { value: 'เป็นกล้องชนิดมุมมองคงที่ (Fixed Box/Bullet)' }
                    ]
                  }
                }
              }
            },
            location: { index: 4 }
          }
        },
        {
          createItem: {
            item: {
              title: 'การดำเนินการบำรุงรักษา / ซ่อมแซมที่ทำในครั้งนี้',
              description: 'เช่น ทำความสะอาดเลนส์, รีบูตสวิตช์ PoE, เปลี่ยนหัวแลน RJ-45, ปรับมุมมองกล้อง',
              questionItem: {
                question: {
                  required: true,
                  textQuestion: { paragraph: true }
                }
              }
            },
            location: { index: 5 }
          }
        },
        {
          createItem: {
            item: {
              title: 'ข้อเสนอแนะหรืออุปกรณ์ที่ต้องจัดซื้อเพิ่มเติม',
              questionItem: {
                question: {
                  required: false,
                  textQuestion: { paragraph: true }
                }
              }
            },
            location: { index: 6 }
          }
        }
      ]
    })
  });

  if (!updateRes.ok) {
    console.warn('Form batchUpdate warning:', await updateRes.text());
  }

  const formInfo: GoogleFormInfo = {
    formId,
    title: formTitle,
    documentTitle: formTitle,
    description: 'แบบบันทึกตรวจสภาพและซ่อมบำรุงกล้องวงจรปิด CCTV ภาคสนาม เทศบาลเมืองชัยภูมิ',
    responderUri: createdForm.responderUri || `https://docs.google.com/forms/d/e/${formId}/viewform`,
    editUri: `https://docs.google.com/forms/d/${formId}/edit`,
    createdAt: new Date().toISOString(),
    templateType: 'camera_maintenance'
  };

  saveGoogleFormToHistory(formInfo);
  return formInfo;
}

/**
 * Fetch Form metadata, questions, and responder URL
 */
export async function getGoogleForm(formId: string): Promise<GoogleFormDetails> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('กรุณาลงชื่อเข้าใช้ Google ด้วยบัญชีที่มีสิทธิ์เข้าถึง (Authentication required)');
  }

  const res = await fetch(`https://forms.googleapis.com/v1/forms/${formId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'ไม่สามารถดึงข้อมูล Google Form ได้');
  }

  return await res.json();
}

/**
 * Fetch all responses submitted to a Google Form
 */
export async function getGoogleFormResponses(formId: string): Promise<{
  responses: GoogleFormResponseItem[];
  totalCount: number;
}> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('กรุณาลงชื่อเข้าใช้ Google ด้วยบัญชีที่มีสิทธิ์เข้าถึง (Authentication required)');
  }

  const res = await fetch(`https://forms.googleapis.com/v1/forms/${formId}/responses`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'ไม่สามารถดึงข้อมูลคำตอบจาก Google Forms ได้');
  }

  const data = await res.json();
  const responses: GoogleFormResponseItem[] = data.responses || [];
  return {
    responses,
    totalCount: responses.length
  };
}
