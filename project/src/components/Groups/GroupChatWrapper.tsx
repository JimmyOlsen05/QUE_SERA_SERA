import React from 'react';
import { useParams } from 'react-router-dom';
import GroupChat from './GroupChat';

const GroupChatWrapper: React.FC = () => {
    const { groupId } = useParams<{ groupId: string }>();
    
    if (!groupId) {
        return <div>Group ID not found</div>;
    }

    return <GroupChat groupId={groupId} />;
};

export default GroupChatWrapper;
