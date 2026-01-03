import { LightningElement, track, wire } from 'lwc';
import { subscribe, publish, MessageContext } from 'lightning/messageService';
import SPEAKER_SELECTION from '@salesforce/messageChannel/speakerSelection__c';
import getSpeakerDetails from '@salesforce/apex/SpeakerService.getSpeakerDetails';
import isDateAvailable from '@salesforce/apex/SpeakerAssignmentService.isDateAvailable';
import createAssignment from '@salesforce/apex/SpeakerAssignmentService.createAssignment';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class BookSession extends LightningElement {
    static renderMode = 'light';
    static delegatesFocus = true;

    @track speakerId;
    @track speaker;
    @track loading = false;

    @track selectedDate;
    @track availabilityMessage = '';
    @track isAvailable = false;
    @track checking = false;
    @track creating = false;

    @wire(MessageContext) messageContext;
    subscription;

    connectedCallback() {
        console.log('BookSession connectedCallback');
        this.subscribeToSelection();
    }

    subscribeToSelection() {
        if (this.subscription) return;
        this.subscription = subscribe(this.messageContext, SPEAKER_SELECTION, async (message) => {
            if (message?.type === 'selection' && message.speaker?.id) {
                this.speakerId = message.speaker.id;
                this.selectedDate = undefined;
                this.isAvailable = false;
                this.availabilityMessage = '';
                await this.loadSpeaker();
            }
        });
    }

    async loadSpeaker() {
        if (!this.speakerId) return;
        this.loading = true;
        try {
            this.speaker = await getSpeakerDetails({ speakerId: this.speakerId });
        } catch (e) {
            this.speaker = undefined;
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error loading speaker details',
                    message: e?.body?.message || e.message || 'Unknown error',
                    variant: 'error'
                })
            );
        } finally {
            this.loading = false;
        }
    }

    get hasSelection() {
        return !!this.speakerId;
    }

    get minDate() {
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const d = String(today.getDate() + 1).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    async handleDateChange(event) {
        const value = event.detail.value;
        this.selectedDate = value;
        if (!value || !this.speakerId) {
            this.isAvailable = false;
            this.availabilityMessage = '';
            return;
        }
        const picked = new Date(value);
        const now = new Date();
        if (picked <= now) {
            this.isAvailable = false;
            this.availabilityMessage = 'Date must be in the future';
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Invalid date',
                    message: 'Date must be in the future',
                    variant: 'error'
                })
            );
            return;
        }

        this.checking = true;
        try {
            const res = await isDateAvailable({ speakerId: this.speakerId, assignmentDate: value });
            this.isAvailable = !!res?.available;
            this.availabilityMessage = res?.message || '';
            if (!this.isAvailable) {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Not available',
                        message: this.availabilityMessage || 'Slot is already booked, try another date',
                        variant: 'error'
                    })
                );
            }
        } catch (e) {
            this.isAvailable = false;
            this.availabilityMessage = e?.body?.message || e.message || 'Unknown error';
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error checking availability',
                    message: this.availabilityMessage,
                    variant: 'error'
                })
            );
        } finally {
            this.checking = false;
        }
    }

    get canCreate() {
        return this.hasSelection && this.selectedDate && this.isAvailable && !this.creating;
    }

    get isCreateDisabled() {
        return !this.canCreate;
    }

    async handleCreate() {
        if (!this.canCreate) return;
        this.creating = true;
        try {
            const newId = await createAssignment({
                speakerId: this.speakerId,
                assignmentDate: this.selectedDate
            });
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'Assignment created: ' + newId,
                    variant: 'success'
                })
            );
            this.isAvailable = false;

            this.refreshCalendar();
        } catch (e) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error creating assignment',
                    message: e?.body?.message || e.message || 'Unknown error',
                    variant: 'error'
                })
            );
        } finally {
            this.creating = false;
        }
    }

    refreshCalendar() {
        const payload = {
            type: 'refresh',
            speakerId: this.speakerId
        };
        publish(this.messageContext, SPEAKER_SELECTION, payload);
    }
}