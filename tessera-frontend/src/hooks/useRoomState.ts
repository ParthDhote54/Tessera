import { useReducer, useCallback } from 'react';
import { RoomState, ParticipantData, ElementData } from '../types/room';
import {
  RoomStateMessage, UserJoinedMessage, UserLeftMessage,
  ObjectLockMessage, ObjectMoveMessage, ObjectReleaseMessage
} from '../types/events';

type Action =
  | { type: 'ROOM_STATE'; msg: RoomStateMessage }
  | { type: 'USER_JOINED'; msg: UserJoinedMessage }
  | { type: 'USER_LEFT'; msg: UserLeftMessage }
  | { type: 'OBJECT_LOCK'; msg: ObjectLockMessage }
  | { type: 'OBJECT_MOVE'; msg: ObjectMoveMessage }
  | { type: 'OBJECT_RELEASE'; msg: ObjectReleaseMessage }
  | { type: 'RESET' };

const initialState: RoomState = {
  roomId: '',
  participants: new Map(),
  elements: new Map(),
};

function roomReducer(state: RoomState, action: Action): RoomState {
  switch (action.type) {
    case 'ROOM_STATE': {
      const { roomId, participants, elements } = action.msg;
      const pMap = new Map<string, ParticipantData>(
        participants.map(p => [p.sessionId, p])
      );
      const eMap = new Map<string, ElementData>(
        elements.map(e => [e.id, e])
      );
      return { roomId, participants: pMap, elements: eMap };
    }

    case 'USER_JOINED': {
      const { sessionId, displayName, color } = action.msg;
      const next = new Map(state.participants);
      next.set(sessionId, { sessionId, displayName, color });
      return { ...state, participants: next };
    }

    case 'USER_LEFT': {
      const next = new Map(state.participants);
      next.delete(action.msg.sessionId);
      return { ...state, participants: next };
    }

    case 'OBJECT_LOCK': {
      const { elementId, lockedBy } = action.msg;
      const el = state.elements.get(elementId);
      if (!el) return state;
      const next = new Map(state.elements);
      next.set(elementId, { ...el, lockedBy });
      return { ...state, elements: next };
    }

    case 'OBJECT_MOVE': {
      const { elementId, x, y } = action.msg;
      const el = state.elements.get(elementId);
      if (!el) return state;
      const next = new Map(state.elements);
      next.set(elementId, { ...el, x, y });
      return { ...state, elements: next };
    }

    case 'OBJECT_RELEASE': {
      const { elementId, x, y } = action.msg;
      const el = state.elements.get(elementId);
      if (!el) return state;
      const next = new Map(state.elements);
      next.set(elementId, { ...el, x, y, lockedBy: null });
      return { ...state, elements: next };
    }

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

export function useRoomState() {
  const [state, dispatch] = useReducer(roomReducer, initialState);

  const applyRoomState = useCallback((msg: RoomStateMessage) => {
    dispatch({ type: 'ROOM_STATE', msg });
  }, []);

  const applyUserJoined = useCallback((msg: UserJoinedMessage) => {
    dispatch({ type: 'USER_JOINED', msg });
  }, []);

  const applyUserLeft = useCallback((msg: UserLeftMessage) => {
    dispatch({ type: 'USER_LEFT', msg });
  }, []);

  const applyObjectLock = useCallback((msg: ObjectLockMessage) => {
    dispatch({ type: 'OBJECT_LOCK', msg });
  }, []);

  const applyObjectMove = useCallback((msg: ObjectMoveMessage) => {
    dispatch({ type: 'OBJECT_MOVE', msg });
  }, []);

  const applyObjectRelease = useCallback((msg: ObjectReleaseMessage) => {
    dispatch({ type: 'OBJECT_RELEASE', msg });
  }, []);

  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  return {
    roomState: state,
    applyRoomState,
    applyUserJoined,
    applyUserLeft,
    applyObjectLock,
    applyObjectMove,
    applyObjectRelease,
    reset,
  };
}
