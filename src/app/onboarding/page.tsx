'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Target, AlertTriangle, Briefcase, MessagesSquare, CheckCircle2, ChevronRight, ChevronLeft, Flag } from 'lucide-react';
import Link from 'next/link';
import { brokerService } from '../services/brokerService';

interface Question {
    id: string;
    text: string;
    options: { value: string; label: string }[];
}

const PART1_QUESTIONS: Question[] = [
    {
        id: 'p1_1',
        text: 'ปกติคุณตั้งใจจะถือครองหุ้นไว้นานแค่ไหน?',
        options: [
            { value: 'A', label: 'ก. ไม่กี่วินาทีถึงไม่กี่นาที' },
            { value: 'B', label: 'ข. จบภายในวันเดียว ไม่ถือข้ามคืน' },
            { value: 'C', label: 'ค. หลายวันถึงหลายสัปดาห์' },
            { value: 'D', label: 'ง. หลายเดือนถึงเป็นปี' }
        ]
    },
    {
        id: 'p1_2',
        text: 'คุณมีเวลาเฝ้าหน้าจอเพื่อดูการเคลื่อนไหวของราคามากแค่ไหน?',
        options: [
            { value: 'A', label: 'ก. ตลอดเวลาที่ตลาดเปิด (วินาทีต่อวินาที)' },
            { value: 'B', label: 'ข. เกือบตลอดทั้งวัน หรือช่วงเปิด/ปิดตลาด' },
            { value: 'C', label: 'ค. เช็คเป็นระยะ หรือหลังเลิกงาน' },
            { value: 'D', label: 'ง. เช็คสัปดาห์ละครั้งหรือเดือนละครั้ง' }
        ]
    },
    {
        id: 'p1_3',
        text: 'กราฟช่วงเวลา (Timeframe) ใดที่คุณใช้ตัดสินใจซื้อขายหลัก?',
        options: [
            { value: 'A', label: 'ก. 1 นาที / 5 นาที' },
            { value: 'B', label: 'ข. 15 นาที / 1 ชั่วโมง' },
            { value: 'C', label: 'ค. รายวัน (Daily)' },
            { value: 'D', label: 'ง. รายสัปดาห์ หรือ รายเดือน (Weekly/Monthly)' }
        ]
    },
    {
        id: 'p1_4',
        text: 'คุณคาดหวังกำไรต่อการเทรดหนึ่งครั้งประมาณเท่าไหร่?',
        options: [
            { value: 'A', label: 'ก. กำไรช่องสองช่องก็เอาแล้ว (น้อยกว่า 1%)' },
            { value: 'B', label: 'ข. 1% - 3% เน้นเก็บรอบในวัน' },
            { value: 'C', label: 'ค. 5% - 15% เน้นกินคำใหญ่ขึ้น' },
            { value: 'D', label: 'ง. มากกว่า 20% หรือถือยาวเพื่อปันผล' }
        ]
    },
    {
        id: 'p1_5',
        text: 'ความถี่ในการส่งคำสั่งซื้อขายของคุณเป็นอย่างไร?',
        options: [
            { value: 'A', label: 'ก. บ่อยมาก (มากกว่า 10-20 ครั้งต่อวัน)' },
            { value: 'B', label: 'ข. ปานกลาง (3-5 ครั้งต่อวัน)' },
            { value: 'C', label: 'ค. น้อย (สัปดาห์ละไม่กี่ครั้ง)' },
            { value: 'D', label: 'ง. นานๆ ครั้ง (เดือนละ 1-2 ครั้ง หรือน้อยกว่านั้น)' }
        ]
    },
    {
        id: 'p1_6',
        text: 'คุณให้ความสำคัญกับ "งบการเงิน" ของบริษัทมากแค่ไหน?',
        options: [
            { value: 'A', label: 'ก. ไม่ดูเลย สนใจแค่การเคลื่อนที่ของราคา' },
            { value: 'B', label: 'ข. ดูบ้างเพื่อเลี่ยงหุ้นที่พื้นฐานแย่มาก' },
            { value: 'C', label: 'ค. ดูควบคู่กับกราฟเทคนิค' },
            { value: 'D', label: 'ง. ให้ความสำคัญเป็นอันดับหนึ่ง' }
        ]
    },
    {
        id: 'p1_7',
        text: 'อะไรคือสัญญาณหลักในการเข้าซื้อหุ้นของคุณ?',
        options: [
            { value: 'A', label: 'ก. ความเร็วของการซื้อขายใน Ticker' },
            { value: 'B', label: 'ข. สัญญาณเทคนิครายวันและข่าวเช้า' },
            { value: 'C', label: 'ค. รูปแบบราคา (Price Pattern) และแนวโน้ม' },
            { value: 'D', label: 'ง. มูลค่าที่แท้จริงของบริษัทเมื่อเทียบกับราคาหุ้น' }
        ]
    },
    {
        id: 'p1_8',
        text: 'หากตลาดหุ้นปิดทำการเสาร์-อาทิตย์ คุณรู้สึกอย่างไร?',
        options: [
            { value: 'A', label: 'ก. อึดอัด อยากเทรดตลอดเวลา' },
            { value: 'B', label: 'ข. เฉยๆ ถือเป็นช่วงพักผ่อนเพราะปิดพอร์ตไปแล้ว' },
            { value: 'C', label: 'ค. กังวลเล็กน้อยว่าจะมีข่าวร้ายมากระทบราคาเปิดวันจันทร์' },
            { value: 'D', label: 'ง. ไม่รู้สึกอะไรเลย เพราะเน้นลงทุนระยะยาว' }
        ]
    },
    {
        id: 'p1_9',
        text: 'คุณจัดการกับความเสี่ยงอย่างไร?',
        options: [
            { value: 'A', label: 'ก. ตั้งจุด Stop Loss แคบมาก ผิดทางรีบคัดทันที' },
            { value: 'B', label: 'ข. ตัดขาดทุนภายในวัน เพื่อไม่ให้มีภาระข้ามคืน' },
            { value: 'C', label: 'ค. ยอมรับการย่อตัวได้ในระดับหนึ่งตามโครงสร้างราคา' },
            { value: 'D', label: 'ง. เน้นกระจายความเสี่ยงในหุ้นหลายกลุ่มและถือยาว' }
        ]
    },
    {
        id: 'p1_10',
        text: 'คุณชอบหุ้นประเภทไหนมากที่สุด?',
        options: [
            { value: 'A', label: 'ก. หุ้นที่มีสภาพคล่องสูงมาก วิ่งเร็วๆ แรงๆ' },
            { value: 'B', label: 'ข. หุ้นที่มีวอลุ่มเข้าในวันนั้นๆ' },
            { value: 'C', label: 'ค. หุ้นที่เป็นแนวโน้มขาขึ้นชัดเจน' },
            { value: 'D', label: 'ง. หุ้น Blue Chip หรือหุ้นพื้นฐานดีที่มีปันผล' }
        ]
    },
    {
        id: 'p1_11',
        text: 'จำนวนหุ้นในพอร์ตที่เหมาะสมสำหรับคุณคือเท่าไหร่?',
        options: [
            { value: 'A', label: 'ก. 1 ตัว (โฟกัสทีละตัวแล้วเข้าออกเร็ว)' },
            { value: 'B', label: 'ข. 2-3 ตัว' },
            { value: 'C', label: 'ค. 4-7 ตัว' },
            { value: 'D', label: 'ง. มากกว่า 7 ตัวขึ้นไป' }
        ]
    },
    {
        id: 'p1_12',
        text: 'คุณใช้เครื่องมือใดประกอบการตัดสินใจหลัก?',
        options: [
            { value: 'A', label: 'ก. หน้าต่าง Bid-Offer และ Volume' },
            { value: 'B', label: 'ข. Indicator ระยะสั้น (RSI, MACD)' },
            { value: 'C', label: 'ค. Trendline และแนวรับแนวต้าน' },
            { value: 'D', label: 'ง. รายงานประจำปี และบทวิเคราะห์เศรษฐกิจ' }
        ]
    },
    {
        id: 'p1_13',
        text: 'หากเกิดเหตุการณ์ Panic Sell คุณจะทำอย่างไร?',
        options: [
            { value: 'A', label: 'ก. กระโดดเข้าเทรดสั้นๆ เพื่อชิงจังหวะรีบาวด์' },
            { value: 'B', label: 'ข. รอดูอยู่นอกตลาดจนกว่าตลาดจะนิ่ง' },
            { value: 'C', label: 'ค. รอจังหวะราคาลงมาถึงแนวรับสำคัญแล้วค่อยสะสม' },
            { value: 'D', label: 'ง. ถือต่อไปเพราะเชื่อในพื้นฐานบริษัทระยะยาว' }
        ]
    },
    {
        id: 'p1_14',
        text: 'เป้าหมายในการเทรดของคุณคืออะไร?',
        options: [
            { value: 'A', label: 'ก. เป็นอาชีพหลัก (Full-time Trader)' },
            { value: 'B', label: 'ข. หารายได้เสริมรายวัน' },
            { value: 'C', label: 'ค. สร้างความมั่งคั่งจากการเติบโตของราคา (Capital Gain)' },
            { value: 'D', label: 'ง. วางแผนเกษียณหรืออิสรภาพทางการเงินระยะยาว' }
        ]
    },
    {
        id: 'p1_15',
        text: 'คุณยอมรับความผันผวนของพอร์ตได้ระดับไหน?',
        options: [
            { value: 'A', label: 'ก. ต่ำมาก (เน้นรักษาเงินต้นทุกวินาที)' },
            { value: 'B', label: 'ข. ปานกลาง (ยอมรับได้ในกรอบของวัน)' },
            { value: 'C', label: 'ค. สูง (ยอมรับการปรับฐาน 10-20% เพื่อกำไรที่มากกว่า)' },
            { value: 'D', label: 'ง. สูงมาก (มองความผันผวนเป็นโอกาสในการสะสมหุ้น)' }
        ]
    }
];

const PART2_QUESTIONS: Question[] = [
    {
        id: 'p2_1',
        text: 'เมื่อเห็นหุ้นที่ราคากำลังพุ่งแรงและคนพูดถึงกันมาก คุณจะทำอย่างไร?',
        options: [
            { value: 'A', label: 'ก. เฉยๆ รอให้ย่อตัวลงมาตามแผนที่วางไว้เท่านั้น' },
            { value: 'B', label: 'ข. นำไปเข้า List ติดตามดูเพื่อหาจังหวะที่เหมาะสม' },
            { value: 'C', label: 'ค. เริ่มกังวลว่าจะตกรถ จึงแบ่งเงินบางส่วนซื้อตามไปก่อน' },
            { value: 'D', label: 'ง. รีบซื้อทันทีด้วยเงินก้อนใหญ่เพราะกลัวราคาจะไปไกลกว่านี้ (FOMO)' }
        ]
    },
    {
        id: 'p2_2',
        text: 'คุณมักจะตั้งจุดตัดขาดทุน (Stop Loss) ทุกครั้งที่ซื้อหุ้นหรือไม่?',
        options: [
            { value: 'A', label: 'ก. ตั้งทุกครั้งและปฏิบัติตามอย่างเคร่งครัด' },
            { value: 'B', label: 'ข. ตั้งไว้ในใจ แต่บางครั้งก็รอดูสถานการณ์ก่อนขาย' },
            { value: 'C', label: 'ค. นานๆ ครั้งจะตั้ง ส่วนใหญ่เน้นถือรอให้ราคากลับมา' },
            { value: 'D', label: 'ง. ไม่เคยตั้งเลย เพราะเชื่อว่าไม่ขายไม่ขาดทุน' }
        ]
    },
    {
        id: 'p2_3',
        text: 'หากหุ้นที่ถืออยู่กำไรเล็กน้อย (เช่น 3-5%) แต่ยังไม่ถึงเป้าหมาย คุณทำอย่างไร?',
        options: [
            { value: 'A', label: 'ก. ถือต่อไปตามแผนจนกว่าจะถึงเป้าหมายที่วางไว้' },
            { value: 'B', label: 'ข. แบ่งขายทำกำไรออกมาบางส่วนเพื่อความอุ่นใจ' },
            { value: 'C', label: 'ค. รีบขายทิ้งทันทีเพราะกลัวราคากลับมาที่ทุน (Disposition Effect)' },
            { value: 'D', label: 'ง. ขายแล้วรีบไปหาหุ้นตัวใหม่ที่กำลังวิ่งแรงกว่า' }
        ]
    },
    {
        id: 'p2_4',
        text: 'เมื่อหุ้นตกมาถึงจุดที่ต้องขาย (Cut Loss) ความรู้สึกของคุณเป็นอย่างไร?',
        options: [
            { value: 'A', label: 'ก. ยอมรับได้ เพราะเป็นส่วนหนึ่งของแผนการจัดการความเสี่ยง' },
            { value: 'B', label: 'ข. เสียดายเล็กน้อย แต่ก็ยอมขายตามวินัย' },
            { value: 'C', label: 'ค. ลังเลและเลื่อนจุดขายออกไปเรื่อยๆ เพื่อรอความหวัง' },
            { value: 'D', label: 'ง. ไม่ยอมขายและเลือกที่จะซื้อเพิ่มเพื่อถัวเฉลี่ยราคาทุน' }
        ]
    },
    {
        id: 'p2_5',
        text: 'เวลาตลาดตกหนักๆ (Panic Sell) ทั่วทั้งกระดาน คุณจะทำอย่างไร?',
        options: [
            { value: 'A', label: 'ก. ปิดจอ แล้วรอให้ตลาดสงบเพื่อวิเคราะห์ตามแผน' },
            { value: 'B', label: 'ข. ตรวจสอบพื้นฐานหุ้นที่ถืออยู่ ถ้าไม่เปลี่ยนก็ถือต่อ' },
            { value: 'C', label: 'ค. เริ่มวิตกกังวลและเช็คราคาบ่อยผิดปกติ' },
            { value: 'D', label: 'ง. ตกใจและรีบขายหุ้นทุกตัวทิ้งทันทีเพราะกลัวเงินหายหมด' }
        ]
    },
    {
        id: 'p2_6',
        text: 'คุณมักจะซื้อหุ้นตามคำแนะนำของผู้อื่น (เพื่อน/กูรู/โซเชียล) บ่อยแค่ไหน?',
        options: [
            { value: 'A', label: 'ก. แทบไม่เคย ซื้อตามการวิเคราะห์ของตัวเอง 100%' },
            { value: 'B', label: 'ข. รับฟังข้อมูลมา แล้วนำมาวิเคราะห์ต่อเองก่อนซื้อ' },
            { value: 'C', label: 'ค. บ่อยครั้ง โดยเฉพาะถ้าเห็นคนยืนยันตรงกันหลายคน' },
            { value: 'D', label: 'ง. ซื้อตามทันทีเพราะเชื่อว่าเขามีข้อมูลวงในหรือเก่งกว่าเรา' }
        ]
    },
    {
        id: 'p2_7',
        text: 'หลังจากการขาดทุนครั้งใหญ่ คุณมีพฤติกรรมอย่างไรในการเทรดครั้งถัดไป?',
        options: [
            { value: 'A', label: 'ก. พักการเทรดเพื่อทบทวนข้อผิดพลาดและปรับกลยุทธ์' },
            { value: 'B', label: 'ข. เทรดตามปกติด้วยจำนวนเงินเท่าเดิม' },
            { value: 'C', label: 'ค. พยายามเทรดให้บ่อยขึ้นเพื่อรีบเอาเงินที่เสียไปคืนมา' },
            { value: 'D', label: 'ง. ทุ่มเงินจำนวนมากขึ้น (Overtrade) เพื่อแก้แค้นตลาดให้ได้ในครั้งเดียว' }
        ]
    },
    {
        id: 'p2_8',
        text: 'คุณเช็คราคาหุ้นในพอร์ตบ่อยแค่ไหนในระหว่างวัน?',
        options: [
            { value: 'A', label: 'ก. เช็คเป็นเวลา เช่น ช่วงเปิด/ปิดตลาด หรือตามแผน' },
            { value: 'B', label: 'ข. เช็คทุกๆ 1-2 ชั่วโมง เมื่อมีเวลาว่าง' },
            { value: 'C', label: 'ค. เช็คบ่อยครั้งเกือบทุกครึ่งชั่วโมง แม้กำลังทำงานอื่น' },
            { value: 'D', label: 'ง. จ้องหน้าจอตลอดเวลา ถ้าไม่ได้ดูจะรู้สึกกระวนกระวายใจ' }
        ]
    },
    {
        id: 'p2_9',
        text: 'ความรู้สึกของคุณเมื่อเห็นคนอื่นได้กำไรจากหุ้นตัวที่คุณไม่มีคืออะไร?',
        options: [
            { value: 'A', label: 'ก. ยินดีด้วยและกลับมาโฟกัสหุ้นในแผนของตัวเอง' },
            { value: 'B', label: 'ข. รู้สึกเสียดายเล็กน้อยที่ไม่ได้ศึกษาหุ้นตัวนั้น' },
            { value: 'C', label: 'ค. เริ่มรู้สึกหงุดหงิดที่ตัวเองพลาดโอกาสทำกำไร' },
            { value: 'D', label: 'ง. รู้สึกล้มเหลวและพยายามหาหุ้นตัวอื่นเพื่อทำกำไรให้ได้มากกว่าเขา' }
        ]
    },
    {
        id: 'p2_10',
        text: 'หากหุ้นที่คุณถืออยู่มี "ข่าวลือ" ด้านลบออกมา คุณจะทำอย่างไร?',
        options: [
            { value: 'A', label: 'ก. ตรวจสอบข้อเท็จจริงจากแหล่งข่าวทางการก่อนตัดสินใจ' },
            { value: 'B', label: 'ข. รอจนกว่าราคาจะสะท้อนข่าวนั้นออกมาในกราฟเทคนิค' },
            { value: 'C', label: 'ค. เริ่มเทขายออกมาครึ่งหนึ่งก่อนเพื่อความปลอดภัย' },
            { value: 'D', label: 'ง. รีบขายทิ้งทันทีโดยไม่สนว่าข่าวนั้นจะเป็นจริงหรือไม่' }
        ]
    },
    {
        id: 'p2_11',
        text: 'เงินที่คุณนำมาใช้ลงทุนในตลาดหุ้นคือเงินส่วนไหน?',
        options: [
            { value: 'A', label: 'ก. เงินออมส่วนเกินที่วางแผนไว้เพื่อการลงทุนระยะยาว' },
            { value: 'B', label: 'ข. เงินเก็บที่อาจจะต้องใช้ในอีก 1-2 ปีข้างหน้า' },
            { value: 'C', label: 'ค. เงินสำรองฉุกเฉินที่ใช้ในยามจำเป็น' },
            { value: 'D', label: 'ง. เงินกู้ยืม หรือเงินที่ต้องใช้จ่ายในชีวิตประจำวันเดือนนี้' }
        ]
    },
    {
        id: 'p2_12',
        text: 'คุณมีความเชื่อเรื่อง "การไม่ขายคือไม่ขาดทุน" มากน้อยแค่ไหน?',
        options: [
            { value: 'A', label: 'ก. ไม่เชื่อเลย เพราะมูลค่าที่ลดลงคือการขาดทุนจริง' },
            { value: 'B', label: 'ข. เชื่อในกรณีที่เป็นหุ้นพื้นฐานดีและราคาแค่ย่อตัว' },
            { value: 'C', label: 'ค. ค่อนข้างเชื่อ เพราะยอมรับการเห็นตัวเลขขาดทุนจริงไม่ได้' },
            { value: 'D', label: 'ง. เชื่ออย่างที่สุด และจะถือหุ้นตัวนั้นไปจนกว่าราคากลับมาเท่าทุน' }
        ]
    },
    {
        id: 'p2_13',
        text: 'เมื่อคุณตัดสินใจขายหุ้นผิดพลาด (ขายแล้ววิ่งต่อ) คุณจะทำอย่างไร?',
        options: [
            { value: 'A', label: 'ก. ยอมรับความผิดพลาดและหาโอกาสใหม่จากตัวอื่น' },
            { value: 'B', label: 'ข. จดบันทึกไว้เป็นบทเรียนเพื่อปรับจังหวะขายในครั้งหน้า' },
            { value: 'C', label: 'ค. รู้สึกเจ็บใจและพยายามหาจังหวะซื้อคืนทันทีแม้ราคาจะสูงกว่าเดิม' },
            { value: 'D', label: 'ง. โทษโชคชะตาและหงุดหงิดจนส่งผลต่อการตัดสินใจในหุ้นตัวอื่น' }
        ]
    },
    {
        id: 'p2_14',
        text: 'การวางแผนการลงทุน (Trading Plan) ของคุณเป็นอย่างไร?',
        options: [
            { value: 'A', label: 'ก. มีแผนชัดเจน ทั้งจุดเข้า เป้าหมายกำไร และจุดตัดขาดทุน' },
            { value: 'B', label: 'ข. มีแผนคร่าวๆ ในหัว แต่ไม่ได้จดบันทึกไว้' },
            { value: 'C', label: 'ค. ทำตามแผนบ้างไม่ทำบ้าง ขึ้นอยู่กับอารมณ์หน้างาน' },
            { value: 'D', label: 'ง. ไม่มีแผนเลย ซื้อขายตามความรู้สึกและสถานการณ์ตลาด' }
        ]
    },
    {
        id: 'p2_15',
        text: 'คุณเคยรู้สึกเครียดจนส่งผลต่อสุขภาพหรือความสัมพันธ์กับคนรอบข้างเพราะหุ้นหรือไม่?',
        options: [
            { value: 'A', label: 'ก. ไม่เคยเลย มองการลงทุนเป็นเรื่องของการเรียนรู้' },
            { value: 'B', label: 'ข. นานๆ ครั้ง เฉพาะช่วงที่ตลาดผันผวนรุนแรงจริงๆ' },
            { value: 'C', label: 'ค. บ่อยครั้ง โดยเฉพาะเวลาที่มีหุ้นติดลบเยอะๆ' },
            { value: 'D', label: 'ง. เป็นประจำ ความสุขในแต่ละวันขึ้นอยู่กับสีของพอร์ตหุ้น' }
        ]
    }
];

const ALL_QUESTIONS = [...PART1_QUESTIONS, ...PART2_QUESTIONS];

interface RiskBehaviorDef {
    key: string;
    thaiName: string;
    englishName: string;
    description: string;
    questions: string[];
    threshold: number;
}

const RISK_BEHAVIOR_DEFS: RiskBehaviorDef[] = [
    {
        key: 'SELLING_WINNERS_TOO_EARLY',
        thaiName: 'การขายหุ้นที่ได้กำไรเร็วเกินไป',
        englishName: 'Selling Winners Too Early',
        description: 'พฤติกรรมการรีบขายหุ้นที่กำลังทำกำไรเร็วเกินไป เนื่องจากความกลัวว่ากำไรจะหายไป ทำให้พลาดโอกาสทำกำไรก้อนใหญ่',
        questions: ['p2_3', 'p2_8', 'p2_13'],
        threshold: 2
    },
    {
        key: 'HOLDING_LOSERS_TOO_LONG',
        thaiName: 'การถือหุ้นที่ขาดทุนนานเกินไป',
        englishName: 'Holding Losers Too Long',
        description: 'พฤติกรรมการทนถือหุ้นที่ขาดทุนไว้ในพอร์ตนานเกินไปโดยไม่ยอมตัดขาดทุน (Cut Loss) เนื่องจากความไม่กล้ายอมรับความผิดพลาด',
        questions: ['p2_2', 'p2_4', 'p2_12'],
        threshold: 2
    },
    {
        key: 'FOMO',
        thaiName: 'การกลัวพลาดโอกาส',
        englishName: 'Fear Of Missing Out (FOMO)',
        description: 'พฤติกรรมการรีบซื้อหุ้นตามกระแสหรือตามฝูงชนอย่างขาดเหตุผล เพียงเพราะกลัวว่าจะพลาดโอกาสทำกำไร',
        questions: ['p2_1', 'p2_6', 'p2_7', 'p2_9'],
        threshold: 2
    },
    {
        key: 'PANIC_SELL',
        thaiName: 'การขายแบบตื่นตระหนก',
        englishName: 'Panic Sell',
        description: 'พฤติกรรมการเทขายหุ้นอย่างรวดเร็วและใช้อารมณ์เมื่อตลาดปรับตัวลงแรง โดยขาดการวิเคราะห์ปัจจัยพื้นฐาน',
        questions: ['p2_5', 'p2_10'],
        threshold: 1
    }
];

type AnswerMap = Record<string, string>;

export default function OnboardingPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState<AnswerMap>({});
    const [isFinished, setIsFinished] = useState(false);
    const [showIntermission, setShowIntermission] = useState(false);

    // Result States
    const [identity, setIdentity] = useState('');
    const [detectedBehaviors, setDetectedBehaviors] = useState<RiskBehaviorDef[]>([]);
    const [stockPicking, setStockPicking] = useState('');
    const [advice, setAdvice] = useState('');

    const handleSelectOption = (questionId: string, value: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    const handleNext = () => {
        if (currentStep < ALL_QUESTIONS.length - 1) {
            setCurrentStep(prev => {
                const next = Math.min(prev + 1, ALL_QUESTIONS.length - 1);
                if (next === 15 && prev === 14) {
                    setShowIntermission(true);
                }
                return next;
            });
        } else {
            calculateResults();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const getMostFrequent = (arr: string[]) => {
        const counts = arr.reduce((acc, val) => {
            acc[val] = (acc[val] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        let maxCount = 0;
        let mostFrequent = 'A';
        for (const [key, count] of Object.entries(counts)) {
            if (count > maxCount) {
                maxCount = count;
                mostFrequent = key;
            }
        }
        return mostFrequent;
    };

    const calculateResults = () => {
        // ===== Part 1: Trader Type =====
        const p1Answers = PART1_QUESTIONS.map(q => answers[q.id] || 'A');
        const p1Result = getMostFrequent(p1Answers);

        let traderIdentity = '';
        let traderStock = '';
        if (p1Result === 'A') {
            traderIdentity = 'Scalper';
            traderStock = 'หุ้นที่มีสภาพคล่องสูงมาก มีความผันผวนสูงในกรอบสั้นๆ';
        } else if (p1Result === 'B') {
            traderIdentity = 'Day Trader';
            traderStock = 'หุ้นที่มีวอลุ่มเข้าในวันนั้นๆ และจับจังหวะสวิงในวันดักข่าวสาร';
        } else if (p1Result === 'C') {
            traderIdentity = 'Swing Trader';
            traderStock = 'หุ้นวัฏจักร (Cyclical Stocks) หรือหุ้นที่ติดแนวรับแนวต้านชัดเจน เช่น PTT, TOP, IVL';
        } else {
            traderIdentity = 'Position Trader / Investor';
            traderStock = 'หุ้น Blue Chip หรือหุ้นพื้นฐานดีที่มีปันผลสม่ำเสมอ เช่น กลุ่มธนาคาร พลังงาน โครงสร้างพื้นฐาน';
        }

        // ===== Part 2: Risk Behavior Detection =====
        const detected = RISK_BEHAVIOR_DEFS.filter(behavior => {
            const riskyCount = behavior.questions.filter(qId => {
                const answer = answers[qId];
                return answer === 'C' || answer === 'D';
            }).length;
            return riskyCount >= behavior.threshold;
        });

        let adviceText = '';
        if (detected.length === 0) {
            adviceText = 'คุณมีวินัยในการเทรดที่ดีมาก! รักษาพฤติกรรมแบบนี้ต่อไป และหมั่นอัพเดทความรู้ในตลาดเสมอ';
        } else {
            adviceText = 'ควรระวังและปรับปรุงพฤติกรรมเสี่ยงที่ตรวจพบ เพื่อเพิ่มโอกาสทำกำไรอย่างยั่งยืนในระยะยาว';
        }

        setIdentity(traderIdentity);
        setStockPicking(traderStock);
        setDetectedBehaviors(detected);
        setAdvice(adviceText);

        setIsFinished(true);
    };

    const finishOnboarding = async () => {
        try {
            // Get email from localStorage saved during registration/login
            const userStr = localStorage.getItem('simtrade_user');
            const email = userStr ? JSON.parse(userStr).email : '';

            if (email) {
                const behaviorNames = detectedBehaviors.map(b => b.englishName).join(', ');
                console.log('Submitting onboarding data:', { email, riskBehavior: behaviorNames, traderType: identity });
                await brokerService.submitOnboarding({
                    email: email,
                    riskBehavior: behaviorNames || 'None',
                    traderType: identity
                });
            } else {
                console.warn('No user email found to submit onboarding data');
            }
        } catch (err) {
            console.error('Failed to submit onboarding data:', err);
        }

        // Save flag to local storage denoting onboarding is complete
        localStorage.setItem('simtrade_onboarded', 'true');
        // Redirect to Home page so they can actually use the system
        router.push('/');
    };

    if (isFinished) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
                <div className="max-w-4xl w-full space-y-8 animate-in fade-in zoom-in duration-500">
                    <div className="text-center">
                        <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500 mb-4" />
                        <h2 className="text-4xl font-extrabold text-foreground tracking-tight">การวิเคราะห์เสร็จสมบูรณ์</h2>
                        <p className="mt-2 text-lg text-muted">ผลลัพธ์ต่อไปนี้ถูกประมวลผลจากคำตอบของคุณเพื่อปรับแต่งกลยุทธ์ที่เหมาะสม</p>
                    </div>

                    {/* Row 1: Identity + Stock Picking */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
                        <div className="bg-surface border border-theme-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-blue-500/10 rounded-xl">
                                    <Target className="w-6 h-6 text-blue-500" />
                                </div>
                                <h3 className="text-lg font-bold text-foreground">Identity Profile</h3>
                            </div>
                            <p className="text-foreground text-2xl font-extrabold">{identity}</p>
                        </div>

                        <div className="bg-surface border border-theme-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-emerald-500/10 rounded-xl">
                                    <Briefcase className="w-6 h-6 text-emerald-500" />
                                </div>
                                <h3 className="text-lg font-bold text-foreground">Stock Picking Strategy</h3>
                            </div>
                            <p className="text-foreground text-lg leading-relaxed"><span className="font-semibold">กลุ่มหุ้นที่เหมาะกับคุณ: </span>{stockPicking}</p>
                        </div>
                    </div>

                    {/* Risk Behaviors Section */}
                    <div className="bg-surface border border-theme-border rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-red-500/10 rounded-xl">
                                <AlertTriangle className="w-6 h-6 text-red-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-foreground">Risk Behavior Analysis</h3>
                                <p className="text-sm text-muted">พฤติกรรมเสี่ยงที่ตรวจพบจากคำตอบของคุณ</p>
                            </div>
                        </div>

                        {detectedBehaviors.length === 0 ? (
                            <div className="text-center py-8">
                                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500 mb-3" />
                                <p className="text-lg font-semibold text-emerald-500">ไม่พบพฤติกรรมเสี่ยง!</p>
                                <p className="text-muted mt-1">คุณมีวินัยในการเทรดที่ดีมาก</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {detectedBehaviors.map((behavior, idx) => (
                                    <div key={behavior.key} className="border border-red-500/30 bg-red-500/5 rounded-xl p-5 animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${idx * 100}ms` }}>
                                        <h4 className="font-bold text-red-400 text-base mb-1">{behavior.englishName}</h4>
                                        <p className="text-sm font-semibold text-foreground mb-2">{behavior.thaiName}</p>
                                        <p className="text-sm text-muted leading-relaxed">{behavior.description}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Advice */}
                    <div className="bg-surface border border-theme-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-gold/10 rounded-xl">
                                <MessagesSquare className="w-6 h-6 text-gold" />
                            </div>
                            <h3 className="text-lg font-bold text-foreground">Personalized Advice</h3>
                        </div>
                        <p className="text-foreground text-lg leading-relaxed font-medium">คำแนะนำ: {advice}</p>
                    </div>

                    <div className="flex justify-center mt-12">
                        <button
                            onClick={finishOnboarding}
                            className="px-10 py-4 bg-gold text-black font-bold text-lg rounded-xl hover:bg-gold-hover transition-all shadow-lg active:scale-95 flex items-center gap-2"
                        >
                            <Flag className="w-5 h-5" />
                            เริ่มใช้งานระบบ
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const currentQuestion = ALL_QUESTIONS[currentStep];

    // Failsafe in case currentStep somehow exceeds the length
    if (!currentQuestion) return null;

    const canProceed = !!answers[currentQuestion.id];
    const isPart2 = currentStep >= 15;

    const currentPartIndex = isPart2 ? currentStep - 15 : currentStep;
    const totalInPart = 15;
    const progressPercent = ((currentPartIndex + 1) / totalInPart) * 100;

    if (showIntermission) {
        return (
            <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
                <div className="max-w-xl w-full bg-surface border border-theme-border p-10 rounded-3xl shadow-xl text-center animate-in fade-in zoom-in duration-500">
                    <div className="mx-auto w-16 h-16 bg-gold/20 rounded-full flex items-center justify-center mb-6">
                        <AlertTriangle className="w-8 h-8 text-gold" />
                    </div>
                    <h2 className="text-3xl font-extrabold mb-4">จบส่วนที่ 1: วิเคราะห์ประเภทนักเทรด</h2>
                    <p className="text-lg text-muted mb-8">
                        เตรียมพร้อมเข้าสู่ส่วนที่ 2 (ข้อ 16 - 30)<br />เราจะมาค้นหาและวิเคราะห์พฤติกรรมความเสี่ยงในการเทรดของคุณกันต่อครับ
                    </p>
                    <button
                        onClick={() => setShowIntermission(false)}
                        className="w-full py-4 bg-gold text-black font-bold text-lg rounded-xl hover:bg-gold-hover transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                    >
                        เริ่มทำแบบทดสอบส่วนที่ 2 <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans transition-colors duration-300">
            <div className="sm:mx-auto sm:w-full sm:max-w-2xl relative z-10">

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface border border-theme-border mb-4 shadow-sm animate-in fade-in zoom-in duration-300">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-muted">PART {isPart2 ? '2' : '1'} of 2</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-gold"></span>
                        <span className="text-sm font-bold text-foreground tracking-wide">
                            {isPart2 ? 'ชุดที่ 2: วิเคราะห์พฤติกรรมเสี่ยง' : 'ชุดที่ 1: วิเคราะห์ประเภทนักเทรด'}
                        </span>
                    </div>
                    <h2 className="text-3xl font-extrabold tracking-tight mb-2">
                        {isPart2 ? 'ค้นหาความเสี่ยงและจุดอ่อนของคุณ' : 'ค้นหาสไตล์การลงทุนที่ใช่สำหรับคุณ'}
                    </h2>
                    <p className="text-base text-muted font-medium">
                        ข้อที่ {currentPartIndex + 1} จาก {totalInPart}
                    </p>

                    {/* Progress Bar */}
                    <div className="w-full bg-surface border border-theme-border rounded-full h-2 mt-6 max-w-md mx-auto overflow-hidden">
                        <div
                            className="bg-gold h-full rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${progressPercent}%` }}
                        ></div>
                    </div>
                </div>

                {/* Card Container */}
                <div className="bg-surface py-8 px-6 shadow-xl sm:rounded-3xl sm:px-10 border border-theme-border min-h-[450px] flex flex-col transition-all duration-300 relative overflow-hidden">

                    {/* Decorative fade top */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gold/50 to-transparent opacity-50"></div>

                    <div className="flex-1 flex flex-col">
                        <h3 className="text-xl sm:text-2xl font-bold mb-8 text-center animate-in fade-in slide-in-from-bottom-2 leading-snug">
                            {currentQuestion.text}
                        </h3>

                        <div className="space-y-4 flex-1">
                            {currentQuestion.options.map((option, idx) => {
                                const isSelected = answers[currentQuestion.id] === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        onClick={() => handleSelectOption(currentQuestion.id, option.value)}
                                        className={`w-full text-left p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 group
                                            ${isSelected
                                                ? 'border-gold bg-gold/5 shadow-md'
                                                : 'border-theme-border hover:border-gold/50 hover:bg-background'}`}
                                        style={{ animationDelay: `${idx * 50}ms` }}
                                    >
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                                            ${isSelected ? 'border-gold bg-gold' : 'border-muted'}`}>
                                            {isSelected && <CheckCircle2 className="w-4 h-4 text-black" />}
                                        </div>
                                        <div>
                                            <h4 className={`text-base font-semibold ${isSelected ? 'text-foreground' : 'text-muted sm:group-hover:text-foreground transition-colors'}`}>
                                                {option.label}
                                            </h4>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Footer Nav */}
                    <div className="mt-8 flex items-center justify-between border-t border-theme-border pt-6">
                        <button
                            onClick={handleBack}
                            disabled={currentStep === 0}
                            className="px-4 py-2 text-sm font-medium text-muted hover:text-foreground disabled:opacity-0 transition-opacity flex items-center gap-1"
                        >
                            <ChevronLeft className="w-4 h-4" /> กลับ
                        </button>
                        <button
                            onClick={handleNext}
                            disabled={!canProceed}
                            className="px-6 py-3 bg-gold text-black text-sm font-bold rounded-xl hover:bg-gold-hover focus:ring-4 focus:ring-gold/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg active:scale-95"
                        >
                            {currentStep === ALL_QUESTIONS.length - 1 ? 'ดูผลการวิเคราะห์' : 'ถัดไป'} <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
