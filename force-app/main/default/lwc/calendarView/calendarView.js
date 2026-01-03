import { LightningElement, api, track, wire } from 'lwc';
import { subscribe, MessageContext } from 'lightning/messageService';
import SPEAKER_SELECTION from '@salesforce/messageChannel/speakerSelection__c';
import getUpcomingAssignmentDates from '@salesforce/apex/SpeakerAssignmentService.getUpcomingAssignmentDates';

export default class CalendarView extends LightningElement {
    static renderMode = 'light';

    @api speakerId;
    @api startDate; 
    @api monthsToShow = 2;

    @track months = []; 
    @track bookedSet = new Set();
    @track loading = false;

    @wire(MessageContext) messageContext;
    subscription;

    connectedCallback() {
        this.subscribeToSelection();
    }

    subscribeToSelection() {
        if (this.subscription) return;
        this.subscription = subscribe(this.messageContext, SPEAKER_SELECTION, async (message) => {
            if (message?.type === 'selection' && message.speaker?.id) {
                this.speakerId = message.speaker.id;
                await this.refresh();
            } else if (message?.type === 'refresh') {
                await this.refresh();
            }
        });
    }

    @api
    async refresh() {
        if (!this.speakerId) {
            this.months = [];
            return;
        }
        this.loading = true;
        try {
            const base = this.startDate ? new Date(this.startDate) : new Date();
            const start = new Date(base.getFullYear(), base.getMonth(), 1);
            const end = new Date(start.getFullYear(), start.getMonth() + this.monthsToShow, 0); 

            const startStr = this.toISODate(start);
            const endStr = this.toISODate(end);

            const booked = await getUpcomingAssignmentDates({
                speakerId: this.speakerId,
                startDate: startStr,
                endDate: endStr
            });

            this.bookedSet = new Set((booked || []).map((d) => d)); 
            this.months = this.buildMonths(start, this.monthsToShow);
        } catch (e) {
            this.months = [];
            this.bookedSet = new Set();
        } finally {
            this.loading = false;
        }
    }

    buildMonths(startDateObj, monthsToShow) {
        const months = [];
        for (let i = 0; i < monthsToShow; i++) {
            const current = new Date(startDateObj.getFullYear(), startDateObj.getMonth() + i, 1);
            const days = [];
            const year = current.getFullYear();
            const month = current.getMonth(); // 0-11
            const daysInMonth = new Date(year, month + 1, 0).getDate();

            for (let d = 1; d <= daysInMonth; d++) {
                const dateObj = new Date(year, month, d);
                const dateStr = this.toISODate(dateObj);
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                const isPast = dateObj <= now;
                const isBooked = this.bookedSet.has(dateStr);

                // Compute CSS class for cleaner template
                let cssClass = 'cal-cell';
                if (isBooked) {
                    cssClass += ' booked';
                } else if (isPast) {
                    cssClass += ' past';
                }

                days.push({
                    key: `${year}-${month + 1}-${d}`,
                    dateStr,
                    day: d,
                    isPast,
                    isBooked,
                    cssClass
                });
            }

            months.push({
                label: `${current.toLocaleString('default', { month: 'long' })} ${year}`,
                year,
                month: month + 1,
                days
            });
        }
        return months;
    }

    toISODate(dt) {
        const y = dt.getFullYear();
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        const d = String(dt.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
}